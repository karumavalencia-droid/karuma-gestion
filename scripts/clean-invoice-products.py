#!/usr/bin/env python3
import json
import re

with open('/Users/karuma/Projects/karuma-gestion/invoices-products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# 更严格的过滤
skip_patterns = [
    # 地址和位置
    r'calle|avenida|cami|plaza|paseo|camino',
    r'valencia|madrid|españa|españa|barcelona|bilbao',
    r'\.es|\.com|\.org|@',
    # IDs and codes
    r'^[A-Z]{1,2}\d{6,}$',  # NIF/CIF style
    r'^\d{4,}$',  # 只有数字
    r'nif|cif|c\.i\.f|cups|reach|iban|bban|cuenta',
    # 商业术语
    r'factura|recibo|documento|página|número|pago|forma de pago',
    r'teléfono|contacto|domicilio|mercantil|registro|código',
    r'cantidad|precio|importe|subtotal|total|base|iva|portes|dto|descuento',
    r'unitario|unidad de|fecha|hora|periodo',
    # URLs and emails
    r'http|www|correo|email',
    # 金融术语
    r'euros?|€|tarjeta|banco|transferencia|sepa',
]

skip_exact = {
    'nº reach:',
    'forma de pago',
    'sepa contado',
    'bbva:',
    'caixa:',
    'total',
    'subtotal',
}

def should_skip(text):
    text_lower = text.lower().strip()

    # Exact matches
    if any(text_lower.startswith(exact) for exact in skip_exact):
        return True

    # Pattern matches
    for pattern in skip_patterns:
        if re.search(pattern, text_lower):
            return True

    # Length checks
    if len(text) < 3 or len(text) > 150:
        return True

    # Must have at least some letters
    if not any(c.isalpha() for c in text):
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

print(f"✅ Productos reales extraídos: {len(clean_products)}\n")

# Agrupar por proveedor
by_supplier = {}
for p in clean_products:
    if p['proveedor'] not in by_supplier:
        by_supplier[p['proveedor']] = []
    by_supplier[p['proveedor']].append(p)

for supplier in sorted(by_supplier.keys()):
    items = by_supplier[supplier]
    print(f"{supplier}: {len(items)}")
    for item in items[:5]:
        print(f"  • {item['nombre']}")
    if len(items) > 5:
        print(f"  ... y {len(items) - 5} más")
    print()

# Guardar productos limpios
output_file = "/Users/karuma/Projects/karuma-gestion/invoices-products-clean.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(clean_products, f, ensure_ascii=False, indent=2)

print(f"💾 Guardado en: {output_file}")
