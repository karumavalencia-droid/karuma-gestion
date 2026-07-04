#!/usr/bin/env python3
"""
Exporta todas las facturas de Supabase Storage y genera un informe
para enviar a las abogacías.

Uso:
    python scripts/export-invoices.py
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
import re

# Agregar el directorio raíz al path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    import requests
except ImportError:
    print("ERROR: requests no instalado. Instala con: pip install requests")
    sys.exit(1)


def load_env(path: Path) -> dict[str, str]:
    """Lee un .env simple (KEY=VALUE)."""
    env: dict[str, str] = {}
    if not path.exists():
        sys.exit(f"ERROR: no se encontro {path}")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        env[key.strip()] = value
    return env


def list_invoices():
    env = load_env(PROJECT_ROOT / ".env.local")

    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")

    if not base_url or not key:
        print("ERROR: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # Listar archivos en el bucket "facturas"
    url = f"{base_url}/storage/v1/object/list/facturas"
    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
    }

    print("📋 Listando facturas en Supabase Storage...\n")

    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        print(f"ERROR: {resp.status_code} {resp.text}")
        sys.exit(1)

    data = resp.json()
    files = data.get("files", [])

    if not files:
        print("No se encontraron facturas.")
        return

    print(f"✅ Se encontraron {len(files)} facturas:\n")

    # Procesar facturas
    invoices = []
    total_size = 0

    for file in files:
        name = file.get("name", "desconocido")
        size = file.get("metadata", {}).get("size", 0)
        created = file.get("created_at", "desconocido")

        invoices.append({
            "name": name,
            "size": size,
            "created": created,
        })
        total_size += size

    # Ordenar por fecha (más recientes primero)
    invoices.sort(
        key=lambda x: datetime.fromisoformat(x["created"].replace("Z", "+00:00"))
        if x["created"] != "desconocido"
        else datetime.min,
        reverse=True,
    )

    # Mostrar lista
    for inv in invoices:
        size_kb = inv["size"] / 1024
        try:
            date = datetime.fromisoformat(inv["created"].replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except:
            date = "desconocido"
        print(f"  • {inv['name'].ljust(60)} {size_kb:>8.1f} KB  ({date})")

    print(f"\n📊 Total: {len(invoices)} facturas, {total_size / 1024 / 1024:.2f} MB\n")

    # Generar email template
    print("📧 Template para enviar a las abogacías:\n")
    print("=" * 72)
    print("Destinatarios:")
    print("  • Kosushi: agi2grupoasesor@gmail.com")
    print("  • Spicy: ociedades.yaou@gmail.com\n")
    print("Asunto: Relación de facturas - Karuma Gestión\n")
    print("Cuerpo del correo:")
    print("-" * 72)
    print("Estimados,\n")
    print("Adjunto encontrará la relación completa de facturas disponibles:\n")

    for i, inv in enumerate(invoices, 1):
        try:
            date = datetime.fromisoformat(inv["created"].replace("Z", "+00:00")).strftime("%d/%m/%Y")
        except:
            date = "desconocido"
        print(f"{i:3d}. {inv['name'].ljust(55)} ({date})")

    print("\nQuedamos a disposición para cualquier aclaración.\n")
    print("Saludos cordiales,")
    print("Karuma Gestión")
    print("=" * 72)

    # Guardar en JSON
    output_path = PROJECT_ROOT / "facturas-export.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "exportDate": datetime.utcnow().isoformat() + "Z",
                "totalInvoices": len(invoices),
                "totalSizeBytes": total_size,
                "invoices": invoices,
                "recipients": {
                    "kosushi": "agi2grupoasesor@gmail.com",
                    "spicy": "ociedades.yaou@gmail.com",
                },
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(f"\n✅ Listado exportado a: {output_path}")
    print("\n📝 Próximos pasos:")
    print("   1. Revisa el email template arriba")
    print("   2. Copia el contenido y envía a ambas abogacías")
    print("   3. O usa --download para descargar todos los PDFs en un ZIP")


if __name__ == "__main__":
    list_invoices()
