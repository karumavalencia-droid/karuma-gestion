#!/usr/bin/env python3
"""
从所有发票中智能提取产品。
寻找包含数量、价格等特征的表格行。
"""

import json
import re
import subprocess
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INVOICES_DIR = PROJECT_ROOT / "facturas"
OUTPUT_FILE = PROJECT_ROOT / "all-invoice-products-smart.json"

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
        return ""

def detect_supplier_from_text(text: str) -> str:
    """从文本内容检测供应商。"""
    if "MAILLARD" in text.upper():
        return "maillard"
    if "KOSUSHI" in text.upper():
        return "kosushi"
    if "COMINPORT" in text.upper():
        return "cominport"
    if "MAKRO" in text.upper():
        return "makro"
    return "desconocido"

def extract_products_from_text(text: str) -> list:
    """
    提取产品行。寻找：
    - 包含字母的行（产品名称）
    - 通常在描述和价格之间
    - 跳过常见的非产品词
    """
    products = []
    lines = text.split('\n')

    skip_words = {
        'factura', 'documento', 'número', 'página', 'fecha', 'contacto',
        'nif', 'cif', 'forma de pago', 'descripción', 'cantidad', 'precio',
        'importe', 'subtotal', 'total', 'portes', 'base', 'iva',
        'albarán', 'albaran', 'tipo', 'artículo', 'unidad',
        'calle', 'avenida', 'camino', 'valencia', 'españa', 'barcelona',
        'teléfono', 'contacto', 'email', 'correo',
        'dirección', 'domicilio', 'mercantil', 'registro',
        'sepa', 'contado', 'transferencia', 'tarjeta', 'banco',
    }

    for i, line in enumerate(lines):
        line = line.strip()

        # 长度检查
        if len(line) < 4 or len(line) > 180:
            continue

        # 如果行是纯数字或纯符号，跳过
        if not any(c.isalpha() for c in line):
            continue

        # 检查是否匹配跳过词
        line_lower = line.lower()
        if any(skip in line_lower for skip in skip_words):
            continue

        # 检查是否类似于产品名称
        # 产品通常包含字母数字混合（SKU + 名称）或者描述
        has_letters = sum(1 for c in line if c.isalpha())
        has_numbers = sum(1 for c in line if c.isdigit())

        # 产品行通常有足够的字母和一些数字（数量、价格等）
        if has_letters >= 3:  # 至少3个字母
            products.append(line)

    return products

def main():
    if not INVOICES_DIR.exists():
        print(f"No invoices directory: {INVOICES_DIR}")
        return

    pdfs = sorted(INVOICES_DIR.glob("*.pdf"))
    print(f"Processing {len(pdfs)} invoice PDFs...\n")

    all_products = defaultdict(lambda: {"items": [], "files": []})
    seen = set()  # 用于去重

    for pdf_path in pdfs:
        text = extract_text_from_pdf(pdf_path)
        if not text:
            continue

        supplier = detect_supplier_from_text(text)
        products = extract_products_from_text(text)

        if products:
            print(f"📄 {pdf_path.name[:50]:50} → {supplier:15} ({len(products)} lines)")

            for product in products:
                # 去重：基于小写产品名称和供应商
                key = (product.lower().strip(), supplier)
                if key not in seen:
                    seen.add(key)
                    all_products[supplier]["items"].append(product)
                    all_products[supplier]["files"].append(pdf_path.name)

    # 生成输出
    output = []
    for supplier in sorted(all_products.keys()):
        data = all_products[supplier]
        for product in data["items"]:
            output.append({
                "nombre": product,
                "proveedor": supplier,
            })

    print(f"\n{'='*60}")
    print(f"📊 总计: {len(output)} 个产品\n")

    # 按供应商分组显示
    by_supplier = defaultdict(list)
    for item in output:
        by_supplier[item["proveedor"]].append(item["nombre"])

    for supplier in sorted(by_supplier.keys()):
        items = by_supplier[supplier]
        print(f"{supplier}: {len(items)} 个产品")
        for item in items[:5]:
            print(f"  • {item[:70]}")
        if len(items) > 5:
            print(f"  ... 还有 {len(items) - 5} 个产品")
        print()

    # 保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ 已提取 {len(output)} 个产品")
    print(f"💾 已保存: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
