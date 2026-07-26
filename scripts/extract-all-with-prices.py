#!/usr/bin/env python3
"""
从所有发票提取产品 + 数量 + 单价。
"""

import json
import re
import subprocess
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "all-products-with-prices.json"

def extract_text_from_pdf(pdf_path):
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout
    except:
        return ""

def extract_products_with_prices(text: str) -> list:
    """
    从发票提取产品 + 数量 + 单价
    格式：产品代码 \n 产品名 \n 数量 \n 单价
    """
    lines = [l for l in text.split('\n') if l.strip()]
    products = []

    i = 0
    while i < len(lines) - 3:
        line0 = lines[i].strip()
        line1 = lines[i+1].strip()
        line2 = lines[i+2].strip()
        line3 = lines[i+3].strip()

        # 检查模式
        is_code = line0.isdigit() and len(line0) <= 10
        is_name = any(c.isalpha() for c in line1) and len(line1) > 2
        qty_match = re.match(r'(\d+[,\.]\d+)', line2)
        price_match = re.match(r'(\d+[,\.]\d+)', line3)

        if is_code and is_name and qty_match and price_match:
            try:
                qty = float(line2.replace(',', '.'))
                price = float(line3.replace(',', '.'))

                # 去除空行和过于简短的名称
                name = line1.strip()
                if len(name) > 3 and not any(x in name.lower() for x in ['albarán', 'total', 'fecha']):
                    products.append({
                        'nombre': name,
                        'cantidad': qty,
                        'precio_unitario': price,
                        'total_linea': qty * price,
                    })
                i += 4
            except:
                i += 1
        else:
            i += 1

    return products

def main():
    if not INVOICES_DIR.exists():
        return

    pdfs = sorted(INVOICES_DIR.glob("*.pdf"))
    print(f"Processing {len(pdfs)} invoices...\n")

    all_products = []
    files_with_prices = 0

    for pdf_path in pdfs:
        text = extract_text_from_pdf(pdf_path)
        if not text:
            continue

        products = extract_products_with_prices(text)

        if products:
            all_products.extend(products)
            files_with_prices += 1
            if files_with_prices <= 10 or files_with_prices % 10 == 0:
                print(f"  {pdf_path.name[:50]:50} → {len(products):3} items")

    print(f"\n{'='*60}")
    print(f"✅ Total: {len(all_products)} product lines extracted\n")

    # Dedup by name, keeping highest price
    unique_products = {}
    for p in all_products:
        key = p['nombre'].lower().strip()
        if key not in unique_products:
            unique_products[key] = p
        else:
            # Keep the one with higher unit price
            if p['precio_unitario'] > unique_products[key]['precio_unitario']:
                unique_products[key] = p

    unique_list = list(unique_products.values())
    unique_list.sort(key=lambda x: x['precio_unitario'], reverse=True)

    print(f"📊 After dedup: {len(unique_list)} unique products\n")

    print("Top 20 by unit price:")
    for p in unique_list[:20]:
        print(f"  €{p['precio_unitario']:8.2f} | {p['nombre'][:60]}")

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(unique_list, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
