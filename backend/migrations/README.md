# Migrations

The application calls `Base.metadata.create_all()` at startup for zero-config local use. For production schema evolution use Alembic:

```bash
cd backend
alembic revision --autogenerate -m "change description"
alembic upgrade head
```

`env.py` uses the configured `DATABASE_URL`, so the same migrations work against PostgreSQL or SQLite.
