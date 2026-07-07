#!/usr/bin/env python3
"""
Extrae códigos de Cominport y genera precios basados en historial de facturas.

Uso:
    python3 scripts/add-prices-to-cominport.py
"""

import sys
import json
import re
import random
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def extract_product_codes():
    """Extrae códigos de productos del archivo TypeScript."""
    ts_file = PROJECT_ROOT / "src/data/cominportProducts.ts"

    products = {}
    with open(ts_file) as f:
        content = f.read()

    # Buscar patrones: codigo: "201021"
    for match in re.finditer(r'codigo:\s*"(\d{5,6})"', content):
        codigo = match.group(1)
        products[codigo] = True

    return list(products.keys())


def load_invoice_usage():
    """Carga el historial de facturas."""
    usage_file = PROJECT_ROOT / "src/data/cominportInvoiceRanking.ts"

    usage = {}
    with open(usage_file) as f:
        content = f.read()

    # Buscar patrones: "201021": { unidadPedido: "paquete/bolsa", pedidosFactura: 9, cantidadFactura: 52 }
    for match in re.finditer(
        r'"(\d{5,6})"\s*:\s*\{\s*unidadPedido[^}]*pedidosFactura:\s*(\d+)',
        content
    ):
        codigo = match.group(1)
        pedidos = int(match.group(2))
        usage[codigo] = pedidos

    return usage


def generate_prices(codigos, usage):
    """Genera precios basados en frecuencia de pedido."""
    print("💰 Generando precios para Cominport...\n")

    prices = {}

    for codigo in codigos:
        pedidos = usage.get(codigo, 0)

        # Escala de precios por frecuencia
        if pedidos >= 9:
            precio_base = 1.85
        elif pedidos >= 7:
            precio_base = 2.50
        elif pedidos >= 5:
            precio_base = 3.75
        elif pedidos >= 3:
            precio_base = 5.50
        elif pedidos > 0:
            precio_base = 8.50
        else:
            # Productos sin historial: precio aleatorio
            precio_base = 12.00

        # Variación consistente por código
        random.seed(int(codigo))
        variacion = 1 + (random.random() * 0.35 - 0.175)
        precio = round(precio_base * variacion, 2)

        prices[codigo] = precio

    return prices


def display_stats(prices, usage):
    """Muestra estadísticas de precios."""
    print(f"✅ Se generaron precios para {len(prices)} productos\n")

    print("📈 Top 15 más caros:")
    for i, (codigo, precio) in enumerate(sorted(prices.items(), key=lambda x: -x[1])[:15], 1):
        pedidos = usage.get(codigo, 0)
        print(f"  {i:2d}. {codigo} | €{precio:6.2f} | {pedidos}× pedidos")

    print("\n💰 Top 15 más baratos:")
    for i, (codigo, precio) in enumerate(sorted(prices.items(), key=lambda x: x[1])[:15], 1):
        pedidos = usage.get(codigo, 0)
        print(f"  {i:2d}. {codigo} | €{precio:6.2f} | {pedidos}× pedidos")

    # Estadísticas
    precios_list = list(prices.values())
    avg_price = sum(precios_list) / len(precios_list)
    print(f"\n📊 Estadísticas:")
    print(f"  Precio promedio: €{avg_price:.2f}")
    print(f"  Precio mínimo: €{min(precios_list):.2f}")
    print(f"  Precio máximo: €{max(precios_list):.2f}")


def main():
    print("🔍 Leyendo catálogo de Cominport...\n")

    codigos = extract_product_codes()
    usage = load_invoice_usage()

    if not codigos:
        print("ERROR: No se encontraron códigos de productos")
        sys.exit(1)

    print(f"✓ Se encontraron {len(codigos)} productos")
    print(f"✓ Historial de {len(usage)} productos\n")

    prices = generate_prices(codigos, usage)
    display_stats(prices, usage)

    # Guardar JSON
    output = PROJECT_ROOT / "cominport-prices.json"
    with open(output, "w") as f:
        json.dump(prices, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Precios guardados en: cominport-prices.json")
    print("\nPróximos pasos:")
    print("  1. Revisar los precios generados")
    print("  2. Actualizar CominportProduct interface para incluir 'precio'")
    print("  3. Integrar precios en la UI del catálogo")


if __name__ == "__main__":
    main()
