#!/usr/bin/env python3
"""
将从邮件中提取的 Kosushi 产品添加到库存系统。
更新 lib/data/inventario.ts 文件。
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_FILE = PROJECT_ROOT / "kosushi-products-from-emails.json"
INVENTARIO_FILE = PROJECT_ROOT / "lib/data/inventario.ts"

def clean_product_name(name: str) -> str:
    """清理产品名称。"""
    # Remove "IMPORTE" and other non-product entries
    if name.upper() in ("IMPORTE", "CANTIDAD", "PRECIO", "SUBTOTAL", "TOTAL"):
        return None

    name = name.strip()

    # Expand common abbreviations
    if name == "CRB.MAI":
        return "CARBÓN MAILLARD MARABÚ PREMIUM"

    return name if len(name) > 3 else None

def main():
    # Read extracted products
    if not PRODUCTS_FILE.exists():
        print(f"Products file not found: {PRODUCTS_FILE}")
        return

    with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
        productos = json.load(f)

    # Clean products
    clean_products = []
    for p in productos:
        nombre = clean_product_name(p['nombre'])
        if nombre:
            clean_products.append(nombre)

    if not clean_products:
        print("No valid products to add")
        return

    print(f"Adding {len(clean_products)} products to inventory:\n")
    for p in clean_products:
        print(f"  • {p}")

    # Read current inventario.ts
    if not INVENTARIO_FILE.exists():
        print(f"\nInventario file not found: {INVENTARIO_FILE}")
        return

    with open(INVENTARIO_FILE, 'r', encoding='utf-8') as f:
        inventario_content = f.read()

    # Extract current items to find max ID
    id_matches = re.findall(r'id:\s*"(\d+)"', inventario_content)
    max_id = max([int(m) for m in id_matches]) if id_matches else 0

    print(f"\nCurrent max ID: {max_id}")

    # Build new items
    new_items = []
    for idx, product in enumerate(clean_products, 1):
        item_id = max_id + idx
        new_item = f'  {{ id: "{item_id}", producto: "{product}", categoria: "Proveedores", stockActual: 0, unidad: "uds", stockMinimo: 5, estado: "bajo" }}'
        new_items.append(new_item)

    # Find the insertion point (before the closing bracket of the array)
    # Replace the closing ]; with new items + closing ];

    # Find the last item in the array
    last_item_match = re.search(r',?\s*\];', inventario_content)
    if not last_item_match:
        print("Could not find inventory array ending")
        return

    insertion_point = last_item_match.start()

    # Build the insert text
    insert_text = ",\n" + ",\n".join(new_items) + "\n"

    # Insert new items
    new_content = inventario_content[:insertion_point] + insert_text + inventario_content[insertion_point:]

    # Save updated inventario
    with open(INVENTARIO_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"\n✅ Updated inventory file with {len(clean_products)} products")
    print(f"📝 File: {INVENTARIO_FILE}")

if __name__ == "__main__":
    main()
