#!/usr/bin/env python3
"""
将最终清理的真实产品添加到库存系统。
专注于 Kosushi 产品（真实购买的物品）。
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_FILE = PROJECT_ROOT / "real-purchase-products.json"
INVENTARIO_FILE = PROJECT_ROOT / "lib/data/inventario.ts"

def categorize_product(name: str) -> str:
    """根据产品名称自动分类。"""
    name_upper = name.upper()

    if any(w in name_upper for w in ['LANJARON', 'AMSTEL', 'AGUA', 'BEBIDA', 'CERVEZA', 'CAFE', 'CAPS']):
        return "Bebidas"
    elif any(w in name_upper for w in ['SALMÓN', 'ATÚN', 'UNAGI', 'SURIMI', 'PULPO', 'GAMBAS', 'CAMARÓN']):
        return "Pescado"
    elif any(w in name_upper for w in ['POLLO', 'PATO', 'CARNE']):
        return "Carnes"
    elif any(w in name_upper for w in ['ENSALADA', 'WAKAME', 'ALGA', 'GARI', 'WASABI', 'GOMA', 'SHIRO']):
        return "Secos"
    elif any(w in name_upper for w in ['CUCHILLO', 'PIEDRA', 'AFILAR', 'UTENSILIO', 'HERRAMIENTA']):
        return "Utensilios"
    elif any(w in name_upper for w in ['NORI', 'YAKINORI', 'HOJA']):
        return "Secos"
    elif any(w in name_upper for w in ['TAKOYAKI', 'KATSUOBUSHI', 'COPOS']):
        return "Secos"
    else:
        return "Proveedores"

def main():
    # Leer productos
    if not PRODUCTS_FILE.exists():
        print(f"Products file not found: {PRODUCTS_FILE}")
        return

    with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
        all_products = json.load(f)

    # Filtrar solo Kosushi products
    kosushi_products = [
        p for p in all_products
        if p['proveedor'] == 'kosushi'
    ]

    # Remover lineas obvias que no son productos
    skip_phrases = {
        'detalles de nuestra',
        'titular:',
        'av.marconi',
        'pae neisa',
        'entregado a',
        'código',
        'zhouzhou',
        'v/referencia',
        'n° pedido',
        'n° envío',
        'jose pedro',
        'excl.',
        'albara de',
        'código destinatario',
        'paque'  # Fragment
    }

    clean_products = []
    for p in kosushi_products:
        name = p['nombre'].strip()
        # Skip obvious non-products
        if any(phrase in name.lower() for phrase in skip_phrases):
            continue
        # Skip very short lines
        if len(name) < 6:
            continue
        clean_products.append(name)

    # Dedup
    unique_products = list(dict.fromkeys(clean_products))

    print(f"Total Kosushi products to add: {len(unique_products)}\n")

    # Read current inventory
    if not INVENTARIO_FILE.exists():
        print(f"Inventory file not found: {INVENTARIO_FILE}")
        return

    with open(INVENTARIO_FILE, 'r', encoding='utf-8') as f:
        inventario_content = f.read()

    # Find max ID
    id_matches = re.findall(r'id:\s*"(\d+)"', inventario_content)
    max_id = max([int(m) for m in id_matches]) if id_matches else 0

    print(f"Current max ID: {max_id}\n")
    print("Sample products to add:")
    for prod in unique_products[:10]:
        print(f"  • {prod}")
    if len(unique_products) > 10:
        print(f"  ... and {len(unique_products) - 10} more\n")

    # Build new items
    new_items = []
    for idx, product in enumerate(unique_products, 1):
        item_id = max_id + idx
        category = categorize_product(product)
        # Escape quotes in product name
        safe_product = product.replace('"', '\\"')
        item_str = f'  {{ id: "{item_id}", producto: "{safe_product}", categoria: "{category}", stockActual: 0, unidad: "uds", stockMinimo: 5, estado: "bajo" }}'
        new_items.append(item_str)

    # Find insertion point
    last_item_match = re.search(r',?\s*\];', inventario_content)
    if not last_item_match:
        print("Could not find inventory array")
        return

    insertion_point = last_item_match.start()

    # Insert new items
    insert_text = ",\n" + ",\n".join(new_items) + "\n"
    new_content = inventario_content[:insertion_point] + insert_text + inventario_content[insertion_point:]

    # Save
    with open(INVENTARIO_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✅ Added {len(unique_products)} products to inventory")
    print(f"📝 File: {INVENTARIO_FILE}")

if __name__ == "__main__":
    main()
