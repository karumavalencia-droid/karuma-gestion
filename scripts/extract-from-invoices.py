#!/usr/bin/env python3
import subprocess
import os
import json
import re
from pathlib import Path
from collections import defaultdict

invoices_dir = "/Users/karuma/Projects/karuma-gestion/facturas"
pdf_files = sorted([f for f in os.listdir(invoices_dir) if f.endswith('.pdf')])

products = []
product_set = set()

# 供应商识别
supplier_map = {
    'facturas': 'Kosushi',
    'facturaelectronica': 'Kosushi',
    'karumavalencia': 'Varios',
    'purchasing': 'Proveedores',
    'admon': 'Admin',
    'atencion': 'Atención',
    'ventas': 'Ventas',
    'pedidos': 'Pedidos',
    'comunicaciones': 'Comunicaciones',
    'no-replay': 'Notificaciones',
    'partners': 'Partners',
    'invoice-statements': 'Invoice Statements',
    'dse-na2': 'Eats Spain',
    'ventaonline': 'Venta Online',
    '6873645': 'Verisure',
}

def extract_text_from_pdf(pdf_path):
    """使用 pdftotext 提取文本"""
    try:
        result = subprocess.run(
            ['pdftotext', pdf_path, '-'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout
    except Exception as e:
        print(f"Error extracting {pdf_path}: {e}")
        return ""

def get_supplier_from_filename(filename):
    """从文件名推断供应商"""
    for key, supplier in supplier_map.items():
        if key in filename.lower():
            return supplier
    return "Desconocido"

print("Extrayendo productos de facturas...")
for idx, pdf_file in enumerate(pdf_files, 1):
    pdf_path = os.path.join(invoices_dir, pdf_file)
    supplier = get_supplier_from_filename(pdf_file)

    # 优先级：Kosushi 供应商 > 其他
    if supplier in ['Kosushi', 'Proveedores', 'Varios']:
        text = extract_text_from_pdf(pdf_path)

        if not text:
            continue

        # 简单提取：寻找可能的产品行
        # 模式：有数字（数量）的行，通常包含名称和价格
        lines = text.split('\n')

        for line in lines:
            # 过滤掉太短或只有数字的行
            if len(line.strip()) < 5:
                continue
            if line.strip().isdigit():
                continue

            # 寻找包含数字和文本的行（可能是产品行）
            if any(c.isdigit() for c in line) and any(c.isalpha() or c == ' ' for c in line):
                # 清理行
                clean = line.strip()

                # 跳过常见的非产品行
                if any(skip in clean.upper() for skip in ['FACTURA', 'PÁGINA', 'TOTAL', 'SUBTOTAL', 'BASE', 'IVA', 'PORTES', 'FORMA DE PAGO', 'FECHA', 'DESCRIPCIÓN', 'CANTIDAD', 'PRECIO', 'IMPORTE', 'CONTACTO', 'DOCUMENTO', 'NÚMERO', 'NIF', 'DOMICILIO']):
                    continue

                # 去掉前导数字（可能是行号或序列号）
                clean = re.sub(r'^\d+\s+', '', clean)

                if len(clean) > 5 and len(clean) < 150:
                    key = (clean.lower(), supplier)
                    if key not in product_set:
                        product_set.add(key)
                        products.append({
                            'nombre': clean,
                            'proveedor': supplier,
                            'categoria': 'Importado de factura',
                            'unidad': 'ud',
                            'stock': 0,
                            'stockMinimo': 1,
                            'precio': 0,
                        })

    if idx % 10 == 0:
        print(f"Procesadas {idx}/{len(pdf_files)} facturas...")

print(f"\n✅ Extraídos {len(products)} productos únicos de {len(pdf_files)} facturas\n")

# Agrupar por proveedor
by_supplier = defaultdict(list)
for p in products:
    by_supplier[p['proveedor']].append(p['nombre'])

for supplier, items in sorted(by_supplier.items()):
    print(f"{supplier}: {len(items)} productos")
    for item in items[:3]:
        print(f"  - {item}")
    if len(items) > 3:
        print(f"  ... y {len(items) - 3} más")

# Guardar JSON
output_file = "/Users/karuma/Projects/karuma-gestion/invoices-products.json"
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

print(f"\n💾 Guardado en: {output_file}")
