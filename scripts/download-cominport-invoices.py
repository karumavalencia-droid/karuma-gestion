#!/usr/bin/env python3
"""
Descarga solo las facturas de Cominport desde Gmail.

Uso:
    python3 scripts/download-cominport-invoices.py
"""

import os
import sys
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
import googleapiclient.discovery
import base64

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
TOKEN_PATH = PROJECT_ROOT / 'token.json'
CREDENTIALS_PATH = PROJECT_ROOT / 'credentials.json'
OUTPUT_DIR = PROJECT_ROOT / 'facturas-cominport-temp'

def get_gmail_service():
    """Obtiene el servicio de Gmail autenticado."""
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_PATH.exists():
                print(f"ERROR: {CREDENTIALS_PATH} no encontrado")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, 'w') as token:
            token.write(creds.to_json())

    return googleapiclient.discovery.build('gmail', 'v1', credentials=creds)

def download_cominport_invoices():
    """Descarga facturas de Cominport."""
    print("🔐 Conectando a Gmail...\n")

    try:
        service = get_gmail_service()
    except Exception as e:
        print(f"ERROR autenticando: {e}")
        sys.exit(1)

    # Crear directorio de salida
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Buscar mensajes de Cominport
    print("🔍 Buscando facturas de Cominport...\n")
    query = 'from:cominport OR subject:cominport filename:pdf'

    try:
        results = service.users().messages().list(userId='me', q=query, maxResults=50).execute()
        messages = results.get('messages', [])
    except Exception as e:
        print(f"ERROR buscando: {e}")
        sys.exit(1)

    if not messages:
        print("⚠️  No se encontraron facturas de Cominport")
        return

    print(f"✅ Se encontraron {len(messages)} mensajes\n")

    downloaded = 0
    for i, msg in enumerate(messages, 1):
        msg_id = msg['id']
        try:
            message = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            headers = message['payload'].get('headers', [])

            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'unknown')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), 'unknown')

            print(f"[{i}/{len(messages)}] {subject}")

            # Buscar attachments
            parts = message['payload'].get('parts', [])
            for part in parts:
                if part['filename'] and part['filename'].lower().endswith('.pdf'):
                    attachment_id = part['body'].get('attachmentId')
                    if attachment_id:
                        print(f"  └─ Descargando: {part['filename']}")

                        attachment = service.users().messages().attachments().get(
                            userId='me', messageId=msg_id, id=attachment_id).execute()

                        data = base64.urlsafe_b64decode(attachment['data'])

                        filepath = OUTPUT_DIR / part['filename']
                        with open(filepath, 'wb') as f:
                            f.write(data)

                        downloaded += 1
                        print(f"     ✓ Guardado en: {filepath}")

        except Exception as e:
            print(f"  ⚠️  Error procesando mensaje: {e}")

    print(f"\n✅ Se descargaron {downloaded} facturas en: {OUTPUT_DIR}")
    print(f"\nPróximos pasos:")
    print(f"  1. Revisar los PDFs en: {OUTPUT_DIR}")
    print(f"  2. Ejecutar: python3 scripts/extract-cominport-prices.py {OUTPUT_DIR}")

if __name__ == '__main__':
    download_cominport_invoices()
