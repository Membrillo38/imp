# Migraciones de Prisma

Para crear y aplicar las migraciones:

```bash
# Crear migración inicial
npx prisma migrate dev --name init

# Aplicar migraciones en producción
npx prisma migrate deploy
```

O puedes ejecutar el SQL directamente desde `supabase-schema.sql` en el SQL Editor de Supabase.

