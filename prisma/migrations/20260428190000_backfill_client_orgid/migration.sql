-- Backfill: setear User.orgId en clientes importados (rol CLIENT) que
-- quedaron con orgId NULL. Esto pasaba con los imports bulk hechos
-- antes de que el endpoint /api/admin/clients/import seteara orgId.
--
-- Sin esto, los clientes importados no aparecen en /admin/clients
-- (el orgScope los filtra porque no tienen citas ni user.orgId).
--
-- Asumimos single-tenant en este momento: usamos la única Organization
-- existente. Si el futuro hay multi-tenant, este UPDATE debería estar
-- scopeado por org en el call-site, no acá.
UPDATE "User"
SET "orgId" = (SELECT id FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE role = 'CLIENT'
  AND "orgId" IS NULL;
