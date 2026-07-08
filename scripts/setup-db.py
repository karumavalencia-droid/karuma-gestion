#!/usr/bin/env python3
"""
Script para crear tablas de proveedores en Supabase
Requiere: pip install psycopg2-binary python-dotenv
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(Path(__file__).parent.parent / ".env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Error: SUPABASE_URL y SERVICE_ROLE_KEY no configuradas en .env.local")
    sys.exit(1)

# Extraer host de la URL
# URL: https://aiwbdjeuvcvkuyoxgomr.supabase.co
db_host = SUPABASE_URL.replace("https://", "").split(".")[0] + ".supabase.co"

print(f"🔗 Conectando a {db_host}...\n")

try:
    # Leer SQL files
    migrations_dir = Path(__file__).parent.parent / "supabase" / "migrations"

    sql_files = [
        "016_proveedores_productos.sql",
        "017_jet_extramar_q2_2026.sql",
    ]

    sql_content = ""
    for file in sql_files:
        filepath = migrations_dir / file
        if filepath.exists():
            print(f"📄 Leyendo {file}...")
            with open(filepath, "r", encoding="utf-8") as f:
                sql_content += f.read() + "\n"
        else:
            print(f"⚠️  Archivo no encontrado: {filepath}")

    if not sql_content:
        print("❌ No hay SQL para ejecutar")
        sys.exit(1)

    # Conectar a Supabase
    conn = psycopg2.connect(
        host=db_host,
        database="postgres",
        user="postgres",
        password=SERVICE_ROLE_KEY,
        port=5432,
        sslmode="require",
    )

    cursor = conn.cursor()

    print(f"\n🚀 Ejecutando migraciones...\n")

    # Ejecutar cada statement
    statements = sql_content.split(";")
    for i, statement in enumerate(statements):
        stmt = statement.strip()
        if not stmt or stmt.startswith("--"):
            continue

        try:
            print(f"  [{i+1}] {stmt[:60]}...")
            cursor.execute(stmt)
            print(f"      ✓")
        except Exception as e:
            print(f"      ✗ {str(e)[:80]}")

    conn.commit()
    print("\n✅ Tablas creadas exitosamente!")

    # Verificar
    cursor.execute("SELECT count(*) FROM information_schema.tables WHERE table_name IN ('suppliers', 'supplier_products')")
    count = cursor.fetchone()[0]
    print(f"   Tablas verificadas: {count}/2")

    cursor.close()
    conn.close()

except ImportError:
    print("❌ Error: psycopg2 no instalado")
    print("   Ejecuta: pip install psycopg2-binary python-dotenv")
    sys.exit(1)
except psycopg2.OperationalError as e:
    print(f"❌ Error de conexión: {e}")
    print(f"   Verifica que:")
    print(f"   - NEXT_PUBLIC_SUPABASE_URL está en .env.local")
    print(f"   - SUPABASE_SERVICE_ROLE_KEY está en .env.local")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
