#!/usr/bin/env python3
"""
Prepara las facturas para enviar a las abogacías:
1. Genera un listado detallado
2. Crea un ZIP con todas las facturas
3. Genera template de email

Uso:
    python scripts/send-invoices-to-lawyers.py
"""

import json
import sys
import zipfile
from pathlib import Path
from datetime import datetime
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FACTURAS_DIR = PROJECT_ROOT / "facturas"
OUTPUT_DIR = PROJECT_ROOT / "facturas-export"

# Abogacías
LAWYERS = {
    "kosushi": "agi2grupoasesor@gmail.com",
    "spicy": "sociedades.yaou@gmail.com",
}


def get_invoice_info(filename: str) -> dict:
    """Extrae fecha y empresa de un nombre de archivo."""
    # Formato esperado: YYYY-MM-DD_empresa_descripcion.pdf
    parts = filename.replace(".pdf", "").split("_", 2)
    return {
        "date": parts[0] if len(parts) > 0 else "unknown",
        "company": parts[1] if len(parts) > 1 else "unknown",
        "filename": filename,
    }


def main():
    # Crear directorio de salida
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("📋 Preparando facturas para envío a abogacías...\n")

    # Listar todos los PDFs
    pdf_files = sorted(FACTURAS_DIR.glob("*.pdf"))

    if not pdf_files:
        print("❌ No se encontraron archivos PDF en", FACTURAS_DIR)
        sys.exit(1)

    print(f"✅ Se encontraron {len(pdf_files)} facturas\n")

    # Procesar información
    invoices = []
    total_size = 0

    for pdf_path in pdf_files:
        size = pdf_path.stat().st_size
        total_size += size
        info = get_invoice_info(pdf_path.name)
        invoices.append({
            **info,
            "size": size,
            "size_kb": size / 1024,
        })

    # Ordenar por fecha (más recientes primero)
    invoices.sort(key=lambda x: x["date"], reverse=True)

    # --- Mostrar listado en pantalla ---
    print("Listado de facturas:")
    print("-" * 75)
    for i, inv in enumerate(invoices, 1):
        print(f"{i:2d}. {inv['date']} | {inv['company']:20s} | {inv['size_kb']:8.1f} KB | {inv['filename']}")

    print("-" * 75)
    print(f"\n📊 Total: {len(invoices)} facturas, {total_size / 1024 / 1024:.2f} MB\n")

    # --- Generar JSON de listado ---
    export_data = {
        "exportDate": datetime.utcnow().isoformat() + "Z",
        "totalInvoices": len(invoices),
        "totalSizeBytes": total_size,
        "totalSizeMB": round(total_size / 1024 / 1024, 2),
        "invoices": invoices,
        "recipients": LAWYERS,
    }

    json_path = OUTPUT_DIR / "invoice-list.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    print(f"✅ Listado JSON guardado: {json_path}")

    # --- Crear CSV para facilitar revisión ---
    csv_path = OUTPUT_DIR / "invoice-list.csv"
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("Número,Fecha,Empresa,Tamaño (KB),Archivo\n")
        for i, inv in enumerate(invoices, 1):
            f.write(f'{i},"{inv["date"]}","{inv["company"]}",{inv["size_kb"]:.1f},"{inv["filename"]}"\n')
    print(f"✅ CSV guardado: {csv_path}")

    # --- Crear ZIP con todas las facturas ---
    zip_path = OUTPUT_DIR / "facturas-completo.zip"
    print(f"\n📦 Creando ZIP con todas las facturas... ", end="", flush=True)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for pdf_path in pdf_files:
            zf.write(pdf_path, arcname=pdf_path.name)

    zip_size_mb = zip_path.stat().st_size / 1024 / 1024
    print(f"✅ ({zip_size_mb:.2f} MB)")
    print(f"   {zip_path}")

    # --- Generar template de email ---
    email_template = f"""
{'='*75}
ENVIAR A:
  • Kosushi: {LAWYERS['kosushi']}
  • Spicy: {LAWYERS['spicy']}

ASUNTO:
  Facturas - Karuma Gestión (Relación completa)

CUERPO:
{'='*75}
Estimados,

Adjunto encontrará la relación completa de facturas de Karuma Gestión:

📊 RESUMEN:
   • Total de facturas: {len(invoices)}
   • Período: {invoices[-1]['date']} a {invoices[0]['date']}
   • Tamaño total: {total_size / 1024 / 1024:.2f} MB

📋 LISTADO DETALLADO:
{'-'*75}
"""

    for i, inv in enumerate(invoices, 1):
        email_template += f"{i:2d}. [{inv['date']}] {inv['company']:20s} {inv['size_kb']:8.1f} KB\n"

    email_template += f"""
{'-'*75}

ARCHIVOS ADJUNTOS:
  1. invoice-list.json    (Listado en formato JSON)
  2. invoice-list.csv     (Listado en formato CSV, fácil para Excel)
  3. facturas-completo.zip (Todos los PDFs comprimidos)

Quedamos a disposición para cualquier aclaración o información adicional.

Saludos cordiales,
Karuma Gestión
{'='*75}
"""

    email_path = OUTPUT_DIR / "email-template.txt"
    with open(email_path, "w", encoding="utf-8") as f:
        f.write(email_template)

    print("\n📧 Template de email:")
    print(email_template)

    # --- Resumen final ---
    print("\n" + "="*75)
    print("✅ ARCHIVOS GENERADOS EN:", OUTPUT_DIR)
    print("="*75)
    print(f"  1. invoice-list.json       - Listado estructurado (para procesar)")
    print(f"  2. invoice-list.csv        - Para abrir en Excel")
    print(f"  3. facturas-completo.zip   - Todos los PDFs ({zip_size_mb:.2f} MB)")
    print(f"  4. email-template.txt      - Template de email")
    print("\n💡 PRÓXIMOS PASOS:")
    print("  1. Copia el contenido de email-template.txt")
    print("  2. Abre tu cliente de email y crea nuevo mensaje")
    print("  3. Destinatarios: agi2grupoasesor@gmail.com, sociedades.yaou@gmail.com")
    print("  4. Adjunta los archivos de la carpeta facturas-export/")
    print("="*75 + "\n")


if __name__ == "__main__":
    main()
