#!/usr/bin/env python3
"""清理从邮件发票提取的产品。"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = PROJECT_ROOT / "all-email-invoices-products.json"
OUTPUT_FILE = PROJECT_ROOT / "all-email-invoices-products-clean.json"

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    products = json.load(f)

skip_patterns = [
    # 地址和位置
    r'calle|avenida|camino|plaza|paseo|vias|cami|roger|lauria|carrera|boulevard',
    r'valencia|madrid|españa|barcelona|bilbao|alicante|mallorca|ibiza',
    r'\.es|\.com|\.org|@|http|www',
    # IDs
    r'^[A-Z]{1,2}\d{6,}$',
    r'^\d{4,}$',
    r'nif|cif|c\.i\.f|cups|reach|iban|bban|cuenta|registro',
    # 商业术语
    r'factura|recibo|documento|página|número|pago|forma de pago',
    r'teléfono|contacto|domicilio|mercantil|albarán|albaran',
    r'cantidad|precio|importe|subtotal|total|base|iva|portes|dto|descuento',
    r'unitario|unidad de|fecha|hora|periodo|fecha de',
    # 金融术语
    r'euros?|€|tarjeta|banco|transferencia|sepa|contado',
    # 常见的非产品词
    r'cliente|entregado|proveedor|distribuidor|código|descripción',
    r'experiencia|laboral|personal|limpieza|desinfección|orden|reposición',
    r'cant\.|ref\.|línea|producto|art\.|ud\.|un\.|uds\.',
    r'de\s+(compra|venta|pago|servicio)',
    r'servicio|prestado|entre|fechas?',
]

skip_exact = {
    'nº reach:',
    'forma de pago',
    'sepa contado',
    'bbva:',
    'caixa:',
    'total',
    'subtotal',
    'fecha',
    'número',
    'cantidad',
    'precio',
    'del',
    'de',
}

def should_skip(text):
    text_lower = text.lower().strip()

    # Exact matches
    if any(text_lower == exact for exact in skip_exact):
        return True

    # Pattern matches
    for pattern in skip_patterns:
        if re.search(pattern, text_lower):
            return True

    # Length checks
    if len(text) < 5 or len(text) > 120:
        return True

    # Must have at least 2 letters
    letter_count = sum(1 for c in text if c.isalpha())
    if letter_count < 2:
        return True

    # Common start patterns to skip
    if text.lower().startswith(('fecha', 'número', 'código', 'teléfono', 'contacto')):
        return True

    return False

clean_products = []
seen = set()

for p in products:
    if should_skip(p['nombre']):
        continue

    key = (p['nombre'].lower().strip(), p['proveedor'])
    if key in seen:
        continue

    seen.add(key)
    clean_products.append(p)

print(f"✅ Cleaned: {len(clean_products)} products\n")

# Group by supplier
by_supplier = {}
for p in clean_products:
    if p['proveedor'] not in by_supplier:
        by_supplier[p['proveedor']] = []
    by_supplier[p['proveedor']].append(p)

for supplier in sorted(by_supplier.keys()):
    items = by_supplier[supplier]
    print(f"{supplier}: {len(items)}")
    for item in items[:3]:
        print(f"  • {item['nombre']}")
    if len(items) > 3:
        print(f"  ... y {len(items) - 3} más")
    print()

# Save
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(clean_products, f, ensure_ascii=False, indent=2)

print(f"💾 Saved: {OUTPUT_FILE}")
