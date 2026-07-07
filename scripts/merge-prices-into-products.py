#!/usr/bin/env python3
"""
Merge precios generados en cominportProducts.ts

Uso:
    python3 scripts/merge-prices-into-products.py
"""

import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

def main():
    print("🔀 Merging precios en cominportProducts.ts...\n")

    # Leer precios
    prices_file = PROJECT_ROOT / "cominport-prices.json"
    with open(prices_file) as f:
        prices = json.load(f)

    print(f"✓ Se cargaron {len(prices)} precios")

    # Leer archivo de productos
    products_file = PROJECT_ROOT / "src/data/cominportProducts.ts"
    with open(products_file) as f:
        content = f.read()

    # Encontrar cada producto y agregar precio
    # Patrón: { codigo: "201366", nombre: "...", categoria: "...", formato: "..." }
    def add_price(match):
        full = match.group(0)
        codigo_match = re.search(r'codigo:\s*"(\d{5,6})"', full)

        if codigo_match:
            codigo = codigo_match.group(1)
            precio = prices.get(codigo)

            if precio:
                # Agregar precio antes del cierre de llave
                if ',\n  },' in full or ',\n  }' in full:
                    updated = full.replace(',\n  }', f',\n    precio: {precio},\n  }}')
                    return updated

        return full

    # Aplicar cambios
    updated_content = re.sub(
        r'\{\s*codigo:\s*"[^"]+",\s*nombre:\s*"[^"]*",\s*categoria:\s*"[^"]*",\s*formato:\s*"[^"]*",?\s*\}',
        add_price,
        content,
        flags=re.DOTALL
    )

    # Contar cambios
    original_count = len(re.findall(r'codigo:', content))
    updated_count = len(re.findall(r'precio:', updated_content))

    print(f"✓ Se agregaron precios a {updated_count} de {original_count} productos")

    # Guardar
    with open(products_file, 'w') as f:
        f.write(updated_content)

    print(f"\n✅ Archivo actualizado: src/data/cominportProducts.ts")
    print(f"\nVerifica los cambios y commitea cuando estés listo.")


if __name__ == "__main__":
    main()
