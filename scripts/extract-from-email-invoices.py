#!/usr/bin/env python3
"""
Extrae productos de todas las facturas descargadas de Gmail.
Combina productos de múltiples proveedores (Kosushi, Makro, etc).
"""

import json
import os
import re
import subprocess
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "all-email-invoices-products.json"

# Identificar proveedores por nombre de archivo
SUPPLIER_PATTERNS = {
    "kosushi": r"kosushi",
    "makro": r"makro",
    "makro_payments": r"payments",  # Makro payments
    "cominport": r"cominport|info",
    "facturaelectronica": r"facturaelectronica",
}

def extract_text_from_pdf(pdf_path):
    """Extrae texto usando pdftotext."""
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout
    except Exception as e:
        print(f"Error extracting {pdf_path.name}: {e}")
        return ""

def detect_supplier(filename):
    """Detecta el proveedor basado en el nombre del archivo."""
    filename_lower = filename.lower()
    for supplier, pattern in SUPPLIER_PATTERNS.items():
        if re.search(pattern, filename_lower):
            return supplier
    return "desconocido"

def extract_products_from_text(text):
    """
    Extrae líneas que parecen ser productos.
    Filtra ruido (direcciones, IDs financieros, etc).
    """
    products = []
    skip_patterns = [
        r'calle|avenida|camino|plaza|paseo',
        r'valencia|madrid|españa|barcelona|bilbao',
        r'\.es|\.com|\.org|@',
        r'^[A-Z]{1,2}\d{6,}$',  # NIF/CIF
        r'^\d{4,}$',  # Solo números
        r'nif|cif|iban|cuenta|cups|reach',
        r'factura|recibo|documento|página|número',
        r'cantidad|precio|importe|subtotal|total|base|iva|dto',
        r'euros?|€|tarjeta|banco|transferencia',
        r'teléfono|contacto|domicilio|mercantil',
        r'http|www|correo|email',
    ]

    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 3 or len(line) > 150:
            continue

        # Skip if matches any pattern
        if any(re.search(pattern, line.lower()) for pattern in skip_patterns):
            continue

        # Must have at least some letters
        if not any(c.isalpha() for c in line):
            continue

        products.append(line)

    return products

def main():
    if not INVOICES_DIR.exists():
        print(f"No invoices directory found at {INVOICES_DIR}")
        return

    pdfs = list(INVOICES_DIR.glob("*.pdf"))
    print(f"Processing {len(pdfs)} PDF files...")

    all_products = defaultdict(lambda: {"products": [], "files": []})

    for pdf_path in sorted(pdfs):
        supplier = detect_supplier(pdf_path.name)
        print(f"\n📄 {pdf_path.name} → {supplier}")

        # Extract text
        text = extract_text_from_pdf(pdf_path)
        if not text:
            print(f"   ⚠️ Could not extract text")
            continue

        # Extract potential products
        lines = extract_products_from_text(text)
        print(f"   Found {len(lines)} potential products")

        for line in lines[:10]:  # Show first 10
            print(f"   • {line[:80]}")

        if len(lines) > 10:
            print(f"   ... and {len(lines) - 10} more")

        all_products[supplier]["products"].extend(lines)
        all_products[supplier]["files"].append(pdf_path.name)

    # Dedupe and organize
    final_products = []
    seen = set()

    for supplier in sorted(all_products.keys()):
        data = all_products[supplier]
        supplier_products = data["products"]
        supplier_files = data["files"]

        print(f"\n{supplier}: {len(supplier_files)} files, {len(supplier_products)} lines")

        for product in supplier_products:
            key = (product.lower().strip(), supplier)
            if key not in seen:
                seen.add(key)
                final_products.append({
                    "nombre": product,
                    "proveedor": supplier,
                })

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_products, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Extracted {len(final_products)} unique products")
    print(f"💾 Saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
