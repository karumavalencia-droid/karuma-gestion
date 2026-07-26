#!/usr/bin/env python3
"""
更好的价格提取 - 处理多行产品/价格格式。
"""

import json
import re
import subprocess
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "products-with-prices-v2.json"

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

def extract_from_kosushi_invoice(text: str) -> list:
    """
    从 Kosushi 发票提取：产品名称 + 数量 + 单价
    格式：产品名 \n\n 数量 \n\n 单价 \n\n 小计
    """
    products = []

    # 分割成行（单独的换行）
    lines = text.split('\n')
    clean_lines = [l.strip() for l in lines if l.strip()]

    skip_keywords = {
        'factura', 'documento', 'número', 'fecha', 'contacto',
        'kosushi', 'lauria', 'nif', 'cif', 'forma de pago',
        'albarán', 'total', 'subtotal', 'iva', 'portes',
        'descripción', 'cantidad', 'precio', 'tipo',
        'madrid', 'valencia', 'españa',
    }

    i = 0
    while i < len(clean_lines):
        line = clean_lines[i]

        # 跳过短行或包含跳过词的行
        if len(line) < 5 or any(kw in line.lower() for kw in skip_keywords):
            i += 1
            continue

        # 如果当前行看起来像产品（包含字母）
        if any(c.isalpha() for c in line) and not any(c.isdigit() for c in line):
            # 检查后续 3 行是否是数量、单价、小计
            if i + 3 < len(clean_lines):
                qty_str = clean_lines[i + 1]
                price_str = clean_lines[i + 2]
                total_str = clean_lines[i + 3]

                # 验证这些看起来像数字
                qty_match = re.match(r'(\d+[,\.]\d+)', qty_str)
                price_match = re.match(r'(\d+[,\.]\d+)', price_str)
                total_match = re.match(r'(\d+[,\.]\d+)', total_str)

                if qty_match and price_match and total_match:
                    try:
                        products.append({
                            'nombre': line,
                            'cantidad': float(qty_str.replace(',', '.')),
                            'precio_unitario': float(price_str.replace(',', '.')),
                            'total': float(total_str.replace(',', '.')),
                            'proveedor': 'kosushi',
                        })
                        i += 4
                        continue
                    except:
                        pass

        i += 1

    return products

def main():
    if not INVOICES_DIR.exists():
        print("No invoices directory")
        return

    # 只处理 facturaelectronica 和 kosushi 发票
    pdfs = [p for p in sorted(INVOICES_DIR.glob("*.pdf"))
            if any(x in p.name.lower() for x in ['facturaelectronica', 'kosushi'])]

    print(f"Processing {len(pdfs)} Kosushi/facturaelectronica PDFs...\n")

    all_products = []

    for pdf_path in pdfs:
        text = extract_text_from_pdf(pdf_path)
        if not text:
            continue

        products = extract_from_kosushi_invoice(text)

        if products:
            print(f"📄 {pdf_path.name[:50]:50} → {len(products)} products")
            all_products.extend(products)

    print(f"\n{'='*60}")
    print(f"✅ Total: {len(all_products)} products with prices\n")

    # Dedup
    seen = set()
    unique = []
    for p in all_products:
        key = p['nombre'].lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(p)

    print(f"📊 After dedup: {len(unique)} unique products\n")

    # Show top products by price
    print("Top 15 by unit price:")
    sorted_by_price = sorted(unique, key=lambda x: x['precio_unitario'], reverse=True)
    for p in sorted_by_price[:15]:
        print(f"  €{p['precio_unitario']:8.2f} | {p['nombre'][:60]}")

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
