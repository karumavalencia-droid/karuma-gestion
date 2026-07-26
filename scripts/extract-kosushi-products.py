#!/usr/bin/env python3
"""
从 Kosushi 发票 PDF 中精确提取产品列表。
Kosushi 发票的格式相对一致，所以我们可以寻找特定的模式。
"""

import json
import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "kosushi-products-from-emails.json"

def extract_text_from_pdf(pdf_path):
    """使用 pdftotext 提取文本。"""
    try:
        result = subprocess.run(
            ["pdftotext", str(pdf_path), "-"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout
    except Exception as e:
        print(f"Error: {pdf_path.name}: {e}")
        return ""

def extract_kosushi_products(text):
    """
    从 Kosushi 发票中提取产品。
    发票中的产品通常在表格中，包含描述、数量和价格。
    """
    products = []

    # 寻找常见的产品行模式：
    # 可能以数字开头（产品编号），后跟产品名称，然后是数量和价格
    lines = text.split('\n')

    in_product_section = False
    for i, line in enumerate(lines):
        line = line.strip()

        # 检测产品表的开始（通常包含"Descripción"或"Producto"）
        if re.search(r'descripción|concepto|producto', line, re.I):
            in_product_section = True
            continue

        # 检测表的结束
        if in_product_section and re.search(r'total|subtotal|base imponible|iva', line, re.I):
            in_product_section = False
            continue

        if not in_product_section:
            continue

        # 跳过空行或太短的行
        if len(line) < 5:
            continue

        # 跳过只有数字的行
        if re.match(r'^\d+[\d\.\,]*$', line):
            continue

        # 跳过常见的非产品文本
        if re.search(r'euros?|€|cantidad|precio|total|unitario|albarán', line, re.I):
            continue

        # 如果行有至少几个字母和可能的数字（产品描述通常这样），添加它
        letter_count = sum(1 for c in line if c.isalpha())
        if letter_count >= 3 and len(line) > 3 and len(line) < 200:
            products.append(line)

    return products

def main():
    if not INVOICES_DIR.exists():
        print(f"No invoices directory: {INVOICES_DIR}")
        return

    # 只处理 Kosushi 发票
    kosushi_pdfs = [
        p for p in INVOICES_DIR.glob("*.pdf")
        if "kosushi" in p.name.lower()
    ]

    print(f"Processing {len(kosushi_pdfs)} Kosushi invoices...")

    all_products = []
    seen = set()

    for pdf_path in sorted(kosushi_pdfs):
        print(f"\n📄 {pdf_path.name}")

        text = extract_text_from_pdf(pdf_path)
        if not text:
            print(f"   Could not extract text")
            continue

        products = extract_kosushi_products(text)
        print(f"   Found {len(products)} lines")

        for product in products[:5]:
            print(f"   • {product[:100]}")

        if len(products) > 5:
            print(f"   ... and {len(products) - 5} more")

        for product in products:
            key = product.lower().strip()
            if key not in seen:
                seen.add(key)
                all_products.append({
                    "nombre": product,
                    "proveedor": "kosushi",
                    "origen": pdf_path.name
                })

    # 额外手动清理：删除仍然是非产品的行
    final_products = []
    skip_keywords = [
        'maillard', 'cami vell', 'beniparrell', 'karuma', 'sociedad limitada',
        'fecha', 'nif', 'forma de pago', 'n.i.f', 'b09856667',
        'contacto', 'teléfono', 'dirección', 'email',
        '/', 'lauria', 'calle', 'número',
    ]

    for p in all_products:
        name_lower = p['nombre'].lower()
        if any(keyword in name_lower for keyword in skip_keywords):
            continue
        final_products.append(p)

    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_products, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Extracted {len(final_products)} Kosushi products")
    print(f"💾 Saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
