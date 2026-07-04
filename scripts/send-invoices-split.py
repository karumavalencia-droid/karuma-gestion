#!/usr/bin/env python3
"""
Clasifica las facturas por empresa (leyendo el contenido de cada PDF)
y envía un email separado a cada abogacía:

  - Kosushi Grupo SL (CIF B09856667)  -> agi2grupoasesor@gmail.com
    (incluye también las facturas sin empresa identificable, según decisión)
  - Spicy Soup SL (CIF B40539801)     -> sociedades.yaou@gmail.com
  - Facturas a nombre personal (NIE X7374525N): NO se envían.

Uso:
    python3 scripts/send-invoices-split.py            # clasifica + envía
    python3 scripts/send-invoices-split.py --dry-run  # solo clasifica y empaqueta
"""

import argparse
import base64
import re
import sys
import warnings
import zipfile
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

warnings.filterwarnings("ignore")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FACTURAS_DIR = PROJECT_ROOT / "facturas"
OUTPUT_DIR = PROJECT_ROOT / "facturas-export"
CREDENTIALS_FILE = PROJECT_ROOT / "credentials.json"
TOKEN_FILE = PROJECT_ROOT / "token.json"

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

COMPANIES = {
    "kosushi": {
        "label": "Kosushi Grupo Sociedad Limitada (CIF B09856667)",
        "email": "agi2grupoasesor@gmail.com",
        "zip": "facturas-kosushi.zip",
    },
    "spicy": {
        "label": "Spicy Soup SL (CIF B40539801)",
        "email": "sociedades.yaou@gmail.com",
        "zip": "facturas-spicy.zip",
    },
}

SPICY_CIF = "B40539801"
KOSUSHI_CIF = "B09856667"
PERSONAL_NIE = "X7374525N"


def classify(pdf_path: Path) -> str:
    """Devuelve 'kosushi', 'spicy' o 'personal' según el contenido del PDF."""
    from pypdf import PdfReader

    text = ""
    try:
        reader = PdfReader(str(pdf_path))
        for page in reader.pages[:2]:
            text += page.extract_text() or ""
    except Exception:
        pass
    t = text.upper()

    has_kosushi = "KOSUSHI" in t or KOSUSHI_CIF in t
    has_spicy = "SPICY" in t or SPICY_CIF in t
    has_personal = PERSONAL_NIE in t

    if has_spicy and not has_kosushi:
        return "spicy"
    if has_kosushi:
        return "kosushi"
    if has_personal:
        return "personal"
    # Sin identificar -> Kosushi (decisión del usuario, 2026-07-03)
    return "kosushi"


def build_email(to: str, subject: str, body: str, attachments: list[Path]) -> dict:
    msg = MIMEMultipart()
    msg["to"] = to
    msg["subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    for path in attachments:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(path.read_bytes())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f"attachment; filename={path.name}")
        msg.attach(part)

    return {"raw": base64.urlsafe_b64encode(msg.as_bytes()).decode()}


def gmail_service():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
    return build("gmail", "v1", credentials=creds)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="No envía emails")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(exist_ok=True)
    pdfs = sorted(FACTURAS_DIR.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"ERROR: no hay PDFs en {FACTURAS_DIR}")

    print(f"📋 Clasificando {len(pdfs)} facturas por contenido...\n")

    groups: dict[str, list[Path]] = {"kosushi": [], "spicy": [], "personal": []}
    for pdf in pdfs:
        groups[classify(pdf)].append(pdf)

    for name, files in groups.items():
        print(f"  {name:10s}: {len(files)} facturas")
    print()

    # Guardar listado de clasificación para revisión
    class_file = OUTPUT_DIR / "clasificacion.txt"
    with open(class_file, "w", encoding="utf-8") as f:
        for name, files in groups.items():
            f.write(f"=== {name.upper()} ({len(files)}) ===\n")
            for p in files:
                f.write(f"  {p.name}\n")
            f.write("\n")
    print(f"✅ Clasificación guardada: {class_file}")

    # Crear ZIP y CSV por empresa
    packages = {}
    for key, info in COMPANIES.items():
        files = groups[key]
        if not files:
            continue

        zip_path = OUTPUT_DIR / info["zip"]
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in files:
                zf.write(p, arcname=p.name)

        csv_path = OUTPUT_DIR / info["zip"].replace(".zip", ".csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("Número,Fecha,Archivo,Tamaño (KB)\n")
            for i, p in enumerate(sorted(files, key=lambda x: x.name), 1):
                date = p.name.split("_")[0]
                f.write(f'{i},"{date}","{p.name}",{p.stat().st_size / 1024:.1f}\n')

        size_mb = zip_path.stat().st_size / 1024 / 1024
        print(f"✅ {info['zip']}: {len(files)} facturas, {size_mb:.2f} MB")
        packages[key] = {"zip": zip_path, "csv": csv_path, "files": files}

    if args.dry_run:
        print("\n🔍 Dry run: no se envía nada. Revisa clasificacion.txt")
        return

    # Enviar emails
    print("\n🔐 Autenticando con Gmail...")
    service = gmail_service()

    for key, pkg in packages.items():
        info = COMPANIES[key]
        files_sorted = sorted(pkg["files"], key=lambda x: x.name)
        listado = "\n".join(
            f"{i:3d}. {p.name}" for i, p in enumerate(files_sorted, 1)
        )
        body = f"""Estimados,

Adjunto encontrarán las facturas correspondientes a {info['label']}.

NOTA IMPORTANTE: Por favor ignoren el correo anterior con el ZIP completo
(contenía facturas de ambas sociedades mezcladas). Este correo contiene
únicamente las facturas de la sociedad que les corresponde.

RESUMEN:
   - Total de facturas: {len(files_sorted)}
   - Adjuntos: {pkg['zip'].name} (PDFs) y {pkg['csv'].name} (listado)

LISTADO:
{listado}

Quedamos a disposición para cualquier aclaración.

Saludos cordiales,
Karuma Valencia
"""
        subject = f"Facturas {info['label'].split('(')[0].strip()} - Karuma"
        message = build_email(info["email"], subject, body, [pkg["zip"], pkg["csv"]])

        print(f"\n📨 Enviando a {info['email']} ({len(files_sorted)} facturas)...")
        result = service.users().messages().send(userId="me", body=message).execute()
        print(f"   ✅ Enviado. Message ID: {result.get('id')}")

    skipped = groups["personal"]
    print(f"\n📌 NO enviadas ({len(skipped)} facturas a nombre personal, NIE {PERSONAL_NIE}):")
    for p in skipped:
        print(f"   - {p.name}")


if __name__ == "__main__":
    main()
