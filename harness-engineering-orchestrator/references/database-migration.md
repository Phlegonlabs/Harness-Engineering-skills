# Database Migration Reference

Guidelines for managing database schema changes safely and consistently across environments.

---

## Tool Selection

Choose the migration tool based on project ORM and complexity:

| Tool | When to Use | Runner |
|------|-------------|--------|
| **Drizzle Kit** | Drizzle ORM projects (default recommendation) | `bunx drizzle-kit generate` / `bunx drizzle-kit migrate` |
| **Prisma Migrate** | Prisma ORM projects | `bunx prisma migrate dev` / `bunx prisma migrate deploy` |
| **Raw SQL** | No ORM, or migrations that cannot be expressed in ORM (e.g., triggers, extensions) | Manual `.sql` files with a runner script |

> If the project uses Drizzle, always prefer Drizzle Kit for schema migrations. Use raw SQL only for database-level features Drizzle Kit does not support.

---

## File Naming Convention

```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_users_table.ts
├── 0003_add_index_users_email.sql
└── 0004_seed_default_roles.ts        ← data migration (separate file)
```

**Format**: `[NNNN]_[description].[sql|ts]`

- Four-digit zero-padded sequence number
- Snake_case description of what the migration does
- `.sql` for pure SQL migrations, `.ts` for programmatic migrations
- Sequence numbers must be strictly increasing and never reused

---

## Migration Rules

### 1. Append-Only
- Never modify or delete an existing migration file after it has been applied
- To undo a change, create a new migration that reverses it

### 2. Reversible
- Every migration should have a corresponding rollback strategy
- For Drizzle Kit: maintain a `down` export or document manual rollback SQL
- For Prisma: rollback is handled via `prisma migrate resolve`
- For raw SQL: provide a paired `[NNNN]_[description].down.sql` file

### 3. Idempotent
- Use `IF NOT EXISTS` / `IF EXISTS` guards where possible
- Running the same migration twice must not produce errors or duplicate data

### 4. Separate Schema from Data
- Schema migrations (DDL): table creation, column changes, index creation
- Data migrations (DML): seed data, backfills, data transformations
- Never combine DDL and DML in the same migration file

---

## Rollback Strategy

### Drizzle Kit
```bash
# Generate rollback SQL (manual review required)
bunx drizzle-kit drop

# Or apply a new migration that reverses the change
bunx drizzle-kit generate --name revert_[description]
bunx drizzle-kit migrate
```

### Prisma Migrate
```bash
# Mark a failed migration as rolled back
bunx prisma migrate resolve --rolled-back [migration_name]

# Or reset the database (development only)
bunx prisma migrate reset
```

### Raw SQL
```bash
# Apply the paired down migration
bun run migrate:down -- --target 0003
```

> Always test rollbacks in a staging environment before applying to production.

---

## CI Validation

Migrations must be validated in CI before merge:

```yaml
# .github/workflows/ci.yml (relevant step)
- name: Validate migrations
  run: |
    # Start a test database
    docker compose -f docker-compose.test.yml up -d db

    # Run all migrations against the test database
    bun run migrate:up

    # Verify schema matches expected state
    bun run migrate:check

    # Run rollback to verify reversibility
    bun run migrate:down -- --target 0

    # Tear down
    docker compose -f docker-compose.test.yml down
```

**CI must block merge if**:
- Any migration fails to apply cleanly
- The resulting schema does not match the ORM schema definition
- Rollback fails for any migration

---

## Commit Format

Migration changes follow the standard Atomic Commit format:

```bash
git commit -m "feat(T[ID]-db): add users table and email index

Migration 0002: creates users table with id, email, name, created_at
Migration 0003: adds unique index on users.email

Migrations tested: ✅ up + down verified
Schema sync: ✅ ORM schema matches migration output

Task-ID: T[ID]
Closes: PRD#F[ID]"
```

- Always include migration numbers in the commit body
- Confirm up + down verification status
- Confirm ORM schema sync status
