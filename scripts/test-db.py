"""Quick connectivity check. Usage: python scripts/test-db.py"""
import os
from pathlib import Path

from dotenv import load_dotenv
import psycopg

root = Path(__file__).resolve().parents[1]
load_dotenv(root / ".env")

dsn = os.environ.get("DATABASE_URL")
if not dsn:
    raise SystemExit("DATABASE_URL missing in .env")

with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute("select version(), current_database(), current_user")
        print("info:", cur.fetchone())
        cur.execute(
            "select tablename from pg_tables where schemaname='public' order by tablename"
        )
        print("tables:", [r[0] for r in cur.fetchall()])
print("OK")
