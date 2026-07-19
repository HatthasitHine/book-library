# Reflection

[ภาษาไทย](REFLECTION.th.md) | English

The hardest part for me was making Prisma 7 and SQLite initialize reliably on Windows.
Prisma's schema engine could apply migrations only after the database file already existed, which made the ordinary clean-checkout path fail.
I added a small wrapper that resolves and creates the intended SQLite file without truncating an existing database, then invokes the local Prisma CLI with an absolute URL.
I also isolated tests behind an exact `backend/test.db` reset guard so a test command cannot erase development data.
That work reinforced for me that setup scripts are part of the product: they need path validation, repeatability, and tests just like an API endpoint.
