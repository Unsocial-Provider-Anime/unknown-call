---
description: "Use when implementing SQLAlchemy CRUD operations in the backend, including creating, reading, updating, deleting, or bulk-inserting records."
applyTo: "backend/**/*.py"
---
# SQLAlchemy CRUD Guidelines

- Follow SQLAlchemy 2.x patterns and reuse the project's models, engine, and database configuration. Do not create a second engine or session factory.
- Before using ORM sessions, check whether the project provides a session factory or dependency. Do not treat a Core `Connection` as an ORM `Session`; if session infrastructure is absent, follow the existing database access pattern or identify the setup needed for ORM sessions.
- Define ORM models with `DeclarativeBase`, `Mapped`, and `mapped_column()`, following neighboring model conventions.
- Build ORM reads with `select()` and execute them with `Session.scalars()`. Put filters in the query instead of loading all rows and filtering in Python.
- Create ORM records with `session.add()` or `session.add_all()`. For large batches where ORM identity tracking is unnecessary, consider SQLAlchemy Core `insert()` with a list of mappings.
- Update records by loading the intended ORM object in the session and changing its attributes. Use explicit filters for bulk updates and deletes; do not unintentionally modify every row.
- Delete ORM records with `session.delete()` after identifying the intended object or objects.
- Give each write a clear transaction boundary. Use the project's transaction and error-handling conventions, and ensure failures roll back the transaction.
- Use migrations for schema changes. Do not create or alter production tables from application CRUD code.