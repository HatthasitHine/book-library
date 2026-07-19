# Reflection

[ภาษาไทย](REFLECTION.th.md) | English

The hardest part for me was getting Prisma 7 and SQLite to work on Windows.
The Prisma schema engine can manage the schema only after the database file already exists, so the normal clean-checkout startup did not work.
I therefore added a wrapper that validates and creates the SQLite file at the specified path without deleting the existing database, then calls the Prisma CLI with an absolute URL.
I then separated the test database and allowed resets only for `backend/test.db` to prevent test commands from deleting development data.
This work taught me that setup scripts need path validation, repeatability, and tests just like API endpoints.
