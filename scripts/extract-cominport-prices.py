#!/usr/bin/env python3
"""
Extrae precios de facturas Cominport desde Supabase Storage.

Uso:
    python scripts/extract-cominport-prices.py [--download-pdfs]

Opciones:
    --download-pdfs    Descarga todos los PDFs a ./facturas-temp/
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Agregar el directorio raíz al path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    import requests
    from pypdf import PdfReader
except ImportError:
    print("ERROR: Faltan dependencias. Instala con:")
    print("  pip install requests pypdf")
    sys.exit(1)


def load_env(path: Path) -> dict[str, str]:
    """Lee un .env simple (KEY=VALUE)."""
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


def download_invoice_pdf(base_url: str, key: str, filename: str) -> bytes:
    """Descarga un PDF de Supabase Storage."""
    url = f"{base_url}/storage/v1/object/facturas/{filename}"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }

    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"  ⚠️  No se pudo descargar {filename}: {resp.status_code}")
        return None

    return resp.content


def is_cominport_invoice(text: str) -> bool:
    """Verifica si el PDF es una factura de Cominport."""
    return "COMINPORT" in text.upper() or "COMIMPORT" in text.upper()


def extract_prices_from_pdf(pdf_bytes: bytes) -> dict[str, float]:
    """
    Extrae codigo → precio de un PDF de Cominport.

    Busca patrones como:
      201021    TAKOYAKI ...    1.23 €
      200676    GOMA WAKAME ...    4.56 €
    """
    prices = {}

    try:
        pdf = PdfReader(pdf_bytes)
    except Exception as e:
        print(f"  ⚠️  Error leyendo PDF: {e}")
        return prices

    all_text = ""
    for page in pdf.pages:
        all_text += page.extract_text() + "\n"

    # Patrón: codigo (5-6 dígitos) ... precio (número con € o ,)
    # Ejemplo: "201021    Takoyaki - Buñuelos  1,45 €"
    pattern = r'^\s*(\d{5,6})\s+(.+?)\s+([\d.,]+)\s*€?\s*$'

    for line in all_text.split('\n'):
        match = re.match(pattern, line, re.IGNORECASE)
        if match:
            codigo = match.group(1)
            nombre = match.group(2).strip()
            precio_str = match.group(3).replace(',', '.')

            try:
                precio = float(precio_str)
                if codigo not in prices or precio > prices[codigo]:
                    prices[codigo] = precio
            except ValueError:
                continue

    return prices


def main():
    env = load_env(PROJECT_ROOT / ".env.local")

    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not base_url or not key:
        print("ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # Listar facturas
    print("📋 Descargando lista de facturas...\n")

    url = f"{base_url}/storage/v1/object/list/facturas"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }

    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"ERROR: {resp.status_code} {resp.text}")
        sys.exit(1)

    data = resp.json()
    files = data.get("files", [])

    if not files:
        print("No se encontraron facturas.")
        return

    # Procesar facturas
    all_prices = defaultdict(list)
    cominport_count = 0
    processed_count = 0

    print(f"✅ Se encontraron {len(files)} facturas. Procesando...\n")

    for file in files:
        filename = file.get("name", "")
        if not filename.lower().endswith('.pdf'):
            continue

        processed_count += 1
        print(f"  [{processed_count}/{len([f for f in files if f['name'].lower().endswith('.pdf')])}] Procesando {filename}...")

        # Descargar PDF
        pdf_bytes = download_invoice_pdf(base_url, key, filename)
        if not pdf_bytes:
            continue

        # Extraer texto
        try:
            pdf = PdfReader(pdf_bytes)
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            print(f"      ⚠️  Error extrayendo texto: {e}")
            continue

        # Verificar si es Cominport
        if not is_cominport_invoice(text):
            continue

        cominport_count += 1
        print(f"      ✓ Factura Cominport detectada")

        # Extraer precios
        prices = extract_prices_from_pdf(pdf_bytes)
        for codigo, precio in prices.items():
            all_prices[codigo].append(precio)

    if cominport_count == 0:
        print("\n⚠️  No se encontraron facturas de Cominport.")
        return

    # Consolidar precios (promedio de todas las facturas)
    consolidated = {}
    for codigo, precio_list in all_prices.items():
        # Usar el precio más reciente o el promedio
        consolidated[codigo] = round(sum(precio_list) / len(precio_list), 2)

    print(f"\n✅ Se procesaron {cominport_count} facturas de Cominport")
    print(f"✅ Se extrajeron precios de {len(consolidated)} productos\n")

    # Guardar JSON
    output_path = PROJECT_ROOT / "cominport-prices.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, indent=2, ensure_ascii=False)

    print(f"💾 Precios guardados en: {output_path}")
    print(f"\nTop 10 productos más caros:")
    for codigo, precio in sorted(consolidated.items(), key=lambda x: -x[1])[:10]:
        print(f"  {codigo}: €{precio:.2f}")


if __name__ == "__main__":
    main()
