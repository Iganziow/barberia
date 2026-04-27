-- Garantiza dedup por (phone, role). Sin esto, un race condition podía
-- crear 2 users con mismo phone normalizado para el mismo rol → historial
-- roto. Postgres permite múltiples NULLs, así que usuarios sin teléfono
-- no chocan.
--
-- Esta migración es IDEMPOTENTE — si ya hay duplicados en la base,
-- los desconflictúa NULL-eando el phone de los users más nuevos
-- (preservando el user más viejo intacto con su historial completo).
-- El operador puede revisar después qué hacer con cada duplicado en el
-- panel admin (aparecen como clientes sin teléfono).
--
-- Antes esta migración era un simple CREATE UNIQUE INDEX que fallaba en
-- producción si la base ya tenía duplicados — bloqueando todos los
-- deploys posteriores hasta resolver manualmente. Ahora corre limpio
-- en cualquier ambiente.

-- 1) Defensive: si el índice ya existe (de un intento parcial anterior),
--    lo borramos para que el CREATE de abajo nunca falle.
DROP INDEX IF EXISTS "User_phone_role_key";

-- 2) Dedup: NULL-ear el phone de los users duplicados, manteniendo el
--    más viejo de cada grupo (phone, role) intacto. No borramos users
--    para preservar appointments + historial completo.
UPDATE "User" u
SET phone = NULL
WHERE u.phone IS NOT NULL
  AND u.id NOT IN (
    SELECT DISTINCT ON (phone, role) id
    FROM "User"
    WHERE phone IS NOT NULL
    ORDER BY phone, role, "createdAt" ASC
  );

-- 3) Ahora ya no hay duplicados → crear el índice único.
CREATE UNIQUE INDEX "User_phone_role_key" ON "User"("phone", "role");
