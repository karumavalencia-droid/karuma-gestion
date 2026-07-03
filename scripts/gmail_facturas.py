#!/usr/bin/env python3
"""
Descarga adjuntos PDF de Gmail (karumavalencia@gmail.com) y los sube a
Supabase Storage (bucket: facturas).

Flujo:
  1. Conecta a Gmail API con OAuth (credentials.json -> token.json).
  2. Busca correos con "has:attachment filename:pdf".
  3. Descarga solo los PDF a ./facturas/ nombrados por remitente + fecha.
  4. Salta los que ya estan descargados (dedupe por manifest + fichero).
  5. Sube los nuevos a Supabase Storage (bucket "facturas").
  6. Lee SUPABASE URL/KEY desde .env.local del proyecto.

Uso:
    pip install -r scripts/requirements-facturas.txt
    python scripts/gmail_facturas.py                 # descarga + sube
    python scripts/gmail_facturas.py --no-upload      # solo descarga
    python scripts/gmail_facturas.py --query "has:attachment filename:pdf newer_than:30d"

Requisitos previos (una vez):
  - Crear un proyecto en Google Cloud Console, activar "Gmail API".
  - Crear credenciales OAuth de tipo "Aplicacion de escritorio".
  - Descargar el JSON como ./credentials.json (junto a este repo).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime, parseaddr
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# --- Rutas (todo relativo a la raiz del proyecto) ---------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_FILE = PROJECT_ROOT / "credentials.json"
TOKEN_FILE = PROJECT_ROOT / "token.json"
ENV_FILE = PROJECT_ROOT / ".env.local"
DOWNLOAD_DIR = PROJECT_ROOT / "facturas"
MANIFEST_FILE = DOWNLOAD_DIR / ".manifest.json"

GMAIL_USER = "karumavalencia@gmail.com"
SUPABASE_BUCKET = "facturas"
# Excluimos CVs por nombre de adjunto (-filename:) para no perder facturas
# reales cuyo cuerpo de email mencione esas palabras.
DEFAULT_QUERY = (
    "has:attachment filename:pdf "
    "-filename:cv -filename:curriculum -filename:currículum -filename:resume"
)

# Solo lectura de Gmail: nunca modifica ni borra correos.
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


# --- Utilidades -------------------------------------------------------------
def load_env(path: Path) -> dict[str, str]:
    """Lee un .env simple (KEY=VALUE) sin dependencias externas."""
    env: dict[str, str] = {}
    if not path.exists():
        sys.exit(f"ERROR: no se encontro {path}")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        env[key.strip()] = value
    return env


def slugify(text: str, maxlen: int = 60) -> str:
    """Convierte un texto en un fragmento seguro para nombre de fichero."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:maxlen] or "desconocido"


def header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def msg_date(headers: list[dict], internal_ms: str | None) -> datetime:
    """Fecha del correo: cabecera Date, con fallback a internalDate."""
    raw = header(headers, "Date")
    if raw:
        try:
            return parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            pass
    if internal_ms:
        return datetime.fromtimestamp(int(internal_ms) / 1000, tz=timezone.utc)
    return datetime.now(tz=timezone.utc)


# --- Gmail ------------------------------------------------------------------
def gmail_service(interactive: bool = True):
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())  # headless: no necesita navegador
        elif not interactive:
            sys.exit(
                "ERROR: token invalido o ausente y se ejecuto en modo "
                "--non-interactive. Ejecuta el script a mano una vez para "
                "reautorizar (abrira el navegador)."
            )
        else:
            if not CREDENTIALS_FILE.exists():
                sys.exit(
                    f"ERROR: falta {CREDENTIALS_FILE}. Descarga las credenciales "
                    "OAuth (Aplicacion de escritorio) desde Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return build("gmail", "v1", credentials=creds)


def list_message_ids(service, query: str) -> list[str]:
    ids: list[str] = []
    page_token = None
    while True:
        resp = (
            service.users()
            .messages()
            .list(userId="me", q=query, pageToken=page_token, maxResults=500)
            .execute()
        )
        ids.extend(m["id"] for m in resp.get("messages", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return ids


def iter_pdf_parts(payload: dict):
    """Recorre el arbol MIME y devuelve (filename, body) de cada parte PDF."""
    stack = [payload]
    while stack:
        part = stack.pop()
        filename = part.get("filename", "") or ""
        mime = part.get("mimeType", "") or ""
        is_pdf = filename.lower().endswith(".pdf") or mime == "application/pdf"
        if is_pdf and part.get("body"):
            yield filename or "factura.pdf", part["body"]
        stack.extend(part.get("parts", []) or [])


def download_attachment(service, message_id: str, body: dict) -> bytes:
    data = body.get("data")
    if not data and body.get("attachmentId"):
        att = (
            service.users()
            .messages()
            .attachments()
            .get(userId="me", messageId=message_id, id=body["attachmentId"])
            .execute()
        )
        data = att.get("data")
    if not data:
        return b""
    return base64.urlsafe_b64decode(data)


# --- Supabase Storage -------------------------------------------------------
def upload_to_supabase(env: dict, local_path: Path, object_name: str) -> bool:
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY", ""
    )
    if not base_url or not key:
        sys.exit("ERROR: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")

    url = f"{base_url}/storage/v1/object/{SUPABASE_BUCKET}/{object_name}"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/pdf",
        # x-upsert=false: no re-sube si ya existe en el bucket
        "x-upsert": "false",
    }
    resp = requests.post(url, headers=headers, data=local_path.read_bytes())
    if resp.status_code in (200, 201):
        return True
    # Supabase devuelve el "ya existe" como 409, o como 400 con
    # statusCode 409 / "Duplicate" en el cuerpo. Lo tratamos como exito.
    if resp.status_code == 409 or '"statusCode":"409"' in resp.text or "Duplicate" in resp.text:
        print(f"    = ya existe en Storage: {object_name}")
        return True
    print(f"    ! error subiendo {object_name}: {resp.status_code} {resp.text[:200]}")
    return False


# --- Manifest (dedupe) ------------------------------------------------------
def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_FILE.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# --- Main -------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="Descarga PDFs de Gmail -> Supabase")
    parser.add_argument("--query", default=DEFAULT_QUERY, help="Filtro de busqueda Gmail")
    parser.add_argument("--no-upload", action="store_true", help="Solo descargar, no subir")
    parser.add_argument(
        "--non-interactive", action="store_true",
        help="Para tareas programadas: nunca abre el navegador; sale con error si el token no sirve",
    )
    args = parser.parse_args()

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    env = load_env(ENV_FILE)
    manifest = load_manifest()

    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] Conectando a Gmail como {GMAIL_USER} ...")
    service = gmail_service(interactive=not args.non_interactive)

    print(f"Buscando: {args.query!r}")
    message_ids = list_message_ids(service, args.query)
    print(f"Correos encontrados: {len(message_ids)}")

    downloaded = skipped = uploaded = 0

    for i, mid in enumerate(message_ids, 1):
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=mid, format="full")
            .execute()
        )
        headers = msg.get("payload", {}).get("headers", [])
        sender = parseaddr(header(headers, "From"))[1] or "desconocido"
        sender_slug = slugify(sender.split("@")[0])
        date = msg_date(headers, msg.get("internalDate"))
        date_str = date.astimezone(timezone.utc).strftime("%Y-%m-%d")

        for filename, body in iter_pdf_parts(msg.get("payload", {})):
            att_id = body.get("attachmentId", "") or filename
            dedupe_key = f"{mid}:{att_id}"

            object_name = f"{date_str}_{sender_slug}_{slugify(Path(filename).stem)}.pdf"
            local_path = DOWNLOAD_DIR / object_name

            if dedupe_key in manifest or local_path.exists():
                skipped += 1
                # Asegura subida aunque ya estuviera descargado de antes.
                if not args.no_upload and not manifest.get(dedupe_key, {}).get("uploaded"):
                    if local_path.exists() and upload_to_supabase(env, local_path, object_name):
                        uploaded += 1
                        manifest.setdefault(dedupe_key, {})["uploaded"] = True
                continue

            data = download_attachment(service, mid, body)
            if not data:
                continue
            local_path.write_bytes(data)
            downloaded += 1
            print(f"[{i}/{len(message_ids)}] descargado: {object_name} ({len(data)} bytes)")

            entry = {
                "file": object_name,
                "sender": sender,
                "date": date_str,
                "uploaded": False,
            }
            if not args.no_upload and upload_to_supabase(env, local_path, object_name):
                uploaded += 1
                entry["uploaded"] = True
            manifest[dedupe_key] = entry
            save_manifest(manifest)

    save_manifest(manifest)
    print("\n--- Resumen ---")
    print(f"  Descargados nuevos : {downloaded}")
    print(f"  Saltados (dedupe)  : {skipped}")
    print(f"  Subidos a Supabase : {uploaded}")
    print(f"  Carpeta local      : {DOWNLOAD_DIR}")


if __name__ == "__main__":
    main()
