#!/usr/bin/env python3
"""Genera cominportPrices.ts completo desde JSON"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Leer JSON
with open(PROJECT_ROOT / "cominport-prices.json") as f:
    prices = json.load(f)

# Generar TypeScript
ts_content = """/** Precios de productos Cominport (generados automáticamente) */
export const cominportPrices: Record<string, number> = {
"""

for codigo, precio in sorted(prices.items()):
    ts_content += f'  "{codigo}": {precio},\n'

ts_content += """};\n
export function getCominportPrice(codigo: string): number | undefined {
  return cominportPrices[codigo];
}

export function getProductWithPrice(
  product: { codigo: string; nombre: string; categoria: string; formato: string }
) {
  return {
    ...product,
    precio: getCominportPrice(product.codigo),
  };
}
"""

# Guardar
output = PROJECT_ROOT / "src/data/cominportPrices.ts"
with open(output, "w") as f:
    f.write(ts_content)

print(f"✅ Generado: {output}")
print(f"✅ Total de precios: {len(prices)}")
