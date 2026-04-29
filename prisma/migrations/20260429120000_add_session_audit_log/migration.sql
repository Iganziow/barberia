-- ── Session ──────────────────────────────────────────────
-- Permite invalidación server-side inmediata de JWT robados, logout
-- explícito, "cerrar todas mis sesiones", etc.
CREATE TABLE "Session" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ip"        TEXT,
  "userAgent" TEXT,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_idx"    ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- ── AuditLog ─────────────────────────────────────────────
-- Registro append-only de acciones admin sensibles.
CREATE TABLE "AuditLog" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT,
  "userEmail"  TEXT,
  "userRole"   TEXT,
  "orgId"      TEXT,
  "action"     TEXT NOT NULL,
  "resource"   TEXT,
  "resourceId" TEXT,
  "metadata"   JSONB,
  "ip"         TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");
CREATE INDEX "AuditLog_userId_idx"          ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx"          ON "AuditLog"("action");
