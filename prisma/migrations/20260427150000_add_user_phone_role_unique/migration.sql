-- Garantiza dedup por (phone, role). Sin esto, un race condition podía
-- crear 2 users con mismo phone normalizado para el mismo rol → historial
-- roto. Postgres permite múltiples NULLs, así que usuarios sin teléfono
-- no chocan.
CREATE UNIQUE INDEX "User_phone_role_key" ON "User"("phone", "role");
