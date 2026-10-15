---
name: sqlalchemy-create-table
description: 'Create database tables with SQLAlchemy 2.x using Declarative ORM models or Core Table constructs. Use when defining SQLAlchemy schemas, mapping Python models to tables, or creating table DDL.'
---

# Create Tables with SQLAlchemy

Use this skill when adding a table or schema definition with SQLAlchemy. Follow the project's existing database and migration conventions before choosing an approach.

## Procedure

1. Inspect the project's SQLAlchemy version, engine setup, and existing schema or migration patterns.
2. Choose Declarative ORM when the table is represented by a Python model. Choose Core `Table` when defining schema without an ORM model.
3. Define the table name, columns, SQL types, primary key, nullability, defaults, and constraints explicitly. Match the project's naming and typing conventions.
4. Use the project's migration workflow for application-managed or deployed schemas. Use `metadata.create_all(engine)` for development, prototypes, or simple setups where automatic DDL is appropriate; it creates missing tables but does not update existing table definitions.
5. Verify that the table is created against the intended database and that its columns and constraints match the requested schema.

## Declarative ORM

Use SQLAlchemy 2.x typed mappings with `DeclarativeBase`, `Mapped`, and `mapped_column()`:

```python
from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user_account"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    fullname: Mapped[str | None] = mapped_column(String(100))
```

Create tables for a simple setup using the project's configured engine:

```python
Base.metadata.create_all(engine)
```

## SQLAlchemy Core

Use `Table`, `Column`, and `MetaData` when a mapped Python class is not needed:

```python
from sqlalchemy import Column, Integer, MetaData, String, Table

metadata = MetaData()

user_table = Table(
    "user_account",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String(50), nullable=False),
    Column("fullname", String(100)),
)
```

Create the table for a simple setup using the project's configured engine:

```python
metadata.create_all(engine)
```