#!/usr/bin/env python3
"""
从发票中提取产品 + 价格信息。
格式：产品名称、数量、单价、供应商。
"""

import json
import re
import subprocess
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "products-with-prices.json"

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

def extract_products_with_prices(text: str, supplier: str) -> list:
    """
    从发票中提取产品行（带价格）。
    寻找：产品名称 + 数量 + 单价 的模式。
    """
    products = []
    lines = text.split('\n')

    # 寻找表格行（通常包含数字和产品名称）
    # 模式：产品名称 \n 数量 \t 单价 \t 小计
    for i, line in enumerate(lines):
        line = line.strip()

        # 跳过太短或太长的行
        if len(line) < 5 or len(line) > 150:
            continue

        # 如果当前行是产品名称（有字母，可能有数字），检查后续行是否有价格
        if not any(c.isalpha() for c in line):
            continue

        # 跳过常见的非产品文本
        if any(w in line.lower() for w in ['factura', 'número', 'fecha', 'total', 'subtotal', 'iva']):
            continue

        # 查看下一行是否是价格行（数字 空格 数字）
        next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""

        # 价格行通常是：数量 单价 小计
        # 例如：2,00    20,970    13,84
        price_pattern = r'(\d+[,\.]\d+)\s+(\d+[,\.]\d+)\s+(\d+[,\.]\d+)'
        if re.search(price_pattern, next_line):
            match = re.search(price_pattern, next_line)
            if match:
                qty = match.group(1).replace(',', '.')
                unit_price = match.group(2).replace(',', '.')
                total = match.group(3).replace(',', '.')

                products.append({
                    'nombre': line,
                    'cantidad': float(qty),
                    'precio_unitario': float(unit_price),
                    'total': float(total),
                    'proveedor': supplier,
                })

    return products

def main():
    if not INVOICES_DIR.exists():
        print(f"No invoices directory: {INVOICES_DIR}")
        return

    pdfs = sorted(INVOICES_DIR.glob("*.pdf"))
    print(f"Processing {len(pdfs)} PDFs for products with prices...\n")

    all_products = []
    by_supplier = defaultdict(int)

    for pdf_path in pdfs:
        # Detect supplier
        if "kosushi" in pdf_path.name.lower():
            supplier = "kosushi"
        elif "makro" in pdf_path.name.lower():
            supplier = "makro"
        elif "cominport" in pdf_path.name.lower():
            supplier = "cominport"
        elif "facturaelectronica" in pdf_path.name.lower():
            supplier = "kosushi"  # These are Kosushi invoices
        else:
            supplier = "desconocido"

        text = extract_text_from_pdf(pdf_path)
        if not text:
            continue

        products = extract_products_with_prices(text, supplier)

        if products:
            print(f"📄 {pdf_path.name[:45]:45} → {len(products)} items")
            all_products.extend(products)
            by_supplier[supplier] += len(products)

    print(f"\n{'='*60}")
    print(f"✅ Total products with prices: {len(all_products)}\n")

    for supplier in sorted(by_supplier.keys()):
        print(f"{supplier}: {by_supplier[supplier]} products")

    # Show samples
    print(f"\n📊 Sample products:\n")
    kosushi = [p for p in all_products if p['proveedor'] == 'kosushi']
    for p in kosushi[:10]:
        print(f"  {p['nombre'][:50]:50} | Qty: {p['cantidad']:6.2f} | Price: €{p['precio_unitario']:8.2f}")

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
