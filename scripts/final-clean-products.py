#!/usr/bin/env python3
"""
最终清理：识别真实产品，去除公司名、地址、技术信息等。
"""

import json
import re
from pathlib import Path
from collections import Counter

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_FILE = PROJECT_ROOT / "all-invoice-products-smart.json"
OUTPUT_FILE = PROJECT_ROOT / "real-purchase-products.json"

# 严格的非产品模式
NON_PRODUCT_PATTERNS = [
    # 地址和位置
    r'^(calle|avenida|camino|plaza|paseo)',
    r'(españa|valencia|madrid|barcelona)',
    r'^[A-Za-z\s]+,\s*\d+',  # 地址格式
    # 公司和组织
    r'(sociedad limitada|s\.?l\.?|sl|sl a|grupo|group)',
    r'(logistica|logística|distribucion|distribución)',
    r'kosushi|lauria|beniparrell|maillard|cominport',
    # 文件/技术信息
    r'\.pdf|\.docx|\.txt|\.com|\.es|\.org',
    r'(página|pagina|nº|número|n\.?\s?reach|cif|nif)',
    # 财务术语
    r'(factura|albarán|albaran|documento|recibo)',
    r'(subtotal|total|base|iva|portes|importe)',
    r'(precio|cantidad|unitario)',
    r'(euros?|€|€.*)',
    r'(sepa|contado|transferencia|pago)',
    # 描述性词汇（不是产品）
    r'(descripción|concepto|artículo|línea)',
    r'(contacto|teléfono|email|correo)',
    r'(fecha|hora|mes|día)',
    r'(forma de|tipo de|clase de)',
    # 经营相关
    r'(mercantil|registro|directivo|consejo)',
    r'(autorizado|aprobado|certificado)',
    # 其他
    r'^[A-Za-z\s]*\s+[0-9]{5,}$',  # 只是数字的行
    r'(aws|amazon|google|apple|microsoft)',  # 技术公司
    r'^\d+$',  # 纯数字
    r'^[A-Z][A-Z\d]{5,}$',  # 只是产品代码
]

def is_real_product(text: str) -> bool:
    """判断是否是真实产品。"""
    text_lower = text.lower().strip()

    # 长度检查
    if len(text_lower) < 5 or len(text_lower) > 150:
        return False

    # 必须有字母
    if not any(c.isalpha() for c in text):
        return False

    # 检查模式
    for pattern in NON_PRODUCT_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return False

    return True

def main():
    # 读取提取的产品
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_products = json.load(f)

    print(f"Starting with {len(all_products)} extracted lines\n")

    # 清理
    real_products = []
    seen = set()

    by_supplier = {}
    for item in all_products:
        supplier = item['proveedor']
        if supplier not in by_supplier:
            by_supplier[supplier] = 0
        by_supplier[supplier] += 1

    print("Cleaning by supplier:\n")

    for supplier in sorted(by_supplier.keys()):
        supplier_items = [p for p in all_products if p['proveedor'] == supplier]
        valid = [p for p in supplier_items if is_real_product(p['nombre'])]

        # 去重
        unique = []
        for p in valid:
            key = (p['nombre'].lower().strip(), supplier)
            if key not in seen:
                seen.add(key)
                unique.append(p)

        real_products.extend(unique)

        print(f"{supplier:15} : {len(supplier_items):4} lines → {len(unique):3} real products")

    print(f"\n{'='*60}")
    print(f"✅ Final count: {len(real_products)} real products\n")

    # 显示样本
    by_supplier_final = {}
    for p in real_products:
        if p['proveedor'] not in by_supplier_final:
            by_supplier_final[p['proveedor']] = []
        by_supplier_final[p['proveedor']].append(p['nombre'])

    for supplier in sorted(by_supplier_final.keys()):
        items = by_supplier_final[supplier]
        print(f"{supplier}: {len(items)} products")
        for item in items[:5]:
            print(f"  • {item}")
        if len(items) > 5:
            print(f"  ... y {len(items) - 5} más")
        print()

    # 保存
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(real_products, f, ensure_ascii=False, indent=2)

    print(f"💾 Saved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
