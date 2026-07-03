#!/usr/bin/env python3
"""
发送发票邮件给律师楼
使用 Gmail API 自动发送
"""

import base64
import sys
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_FILE = PROJECT_ROOT / "credentials.json"
TOKEN_FILE = PROJECT_ROOT / "token.json"
EXPORT_DIR = PROJECT_ROOT / "facturas-export"

GMAIL_USER = "karumavalencia@gmail.com"
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]

RECIPIENTS = [
    "agi2grupoasesor@gmail.com",  # Kosushi
    "sociedades.yaou@gmail.com",  # Spicy
]


def gmail_service():
    """Conecta a Gmail API."""
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                sys.exit(
                    f"ERROR: falta {CREDENTIALS_FILE}\n"
                    "Descarga las credenciales OAuth desde Google Cloud Console"
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)

        TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")

    return build("gmail", "v1", credentials=creds)


def create_message_with_attachment(sender, to, subject, message_text):
    """Crea un mensaje de Gmail con archivos adjuntos."""
    message = MIMEMultipart()
    message["to"] = ", ".join(to)
    message["subject"] = subject

    # Agregar cuerpo del mensaje
    message.attach(MIMEText(message_text, "plain", "utf-8"))

    # Agregar archivos
    attachments = [
        EXPORT_DIR / "facturas-completo.zip",
        EXPORT_DIR / "invoice-list.csv",
        EXPORT_DIR / "invoice-list.json",
    ]

    for file_path in attachments:
        if not file_path.exists():
            print(f"⚠️  Archivo no encontrado: {file_path}")
            continue

        with open(file_path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())

        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename= {file_path.name}",
        )
        message.attach(part)
        print(f"  ✓ Adjuntando: {file_path.name}")

    # Convertir a bytes y codificar en base64
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    return {"raw": raw_message}


def send_message(service, message):
    """Envía un mensaje a través de Gmail."""
    try:
        result = service.users().messages().send(userId="me", body=message).execute()
        return result
    except Exception as e:
        print(f"ERROR al enviar: {e}")
        return None


def main():
    print("📧 Enviando facturas a las abogacías...\n")

    # Leer template de email
    template_file = EXPORT_DIR / "email-template.txt"
    if not template_file.exists():
        sys.exit(f"ERROR: No encontrado {template_file}")

    with open(template_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Extraer cuerpo del email (entre CUERPO: y ARCHIVOS ADJUNTOS:)
    lines = content.split("\n")
    start_idx = None
    end_idx = None

    for i, line in enumerate(lines):
        if "CUERPO:" in line:
            start_idx = i + 1
        if "ARCHIVOS ADJUNTOS:" in line:
            end_idx = i

    if start_idx and end_idx:
        message_text = "\n".join(lines[start_idx:end_idx]).strip()
    else:
        # Fallback: usar todo el contenido después de CUERPO:
        message_text = "\n".join(lines).split("CUERPO:")[-1].strip()

    print("📋 Contenido del email:")
    print("-" * 70)
    print(message_text)
    print("-" * 70)
    print()

    # Conectar a Gmail
    print("🔐 Autenticando con Gmail...")
    service = gmail_service()
    print("✅ Autenticación exitosa\n")

    # Crear y enviar mensaje
    print("📨 Preparando mensaje con adjuntos...")
    message = create_message_with_attachment(
        sender=GMAIL_USER,
        to=RECIPIENTS,
        subject="Facturas - Karuma Gestión (Relación completa)",
        message_text=message_text,
    )
    print()

    print("🚀 Enviando...")
    result = send_message(service, message)

    if result:
        print(f"\n✅ ¡Correo enviado exitosamente!")
        print(f"   Destinatarios: {', '.join(RECIPIENTS)}")
        print(f"   Message ID: {result.get('id')}")
    else:
        sys.exit("❌ Error al enviar el correo")


if __name__ == "__main__":
    main()
