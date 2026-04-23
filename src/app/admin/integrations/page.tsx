"use client";

import { useCallback, useEffect, useState } from "react";
import UserAvatarBadge from "@/components/ui/UserAvatarBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};
type WebhookRow = {
  id: string;
  url: string;
  event: string;
  active: boolean;
  createdAt: string;
};

const EVENTS = [
  { value: "appointment.completed", label: "Cita completada" },
  { value: "appointment.canceled", label: "Cita cancelada" },
  { value: "appointment.created", label: "Cita creada" },
];

// ─── Icons ──────────────────────────────────────────────────────────────
function IconKey() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function IconWebhook() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M8.5 16L17 8M9 18h9a0 0 0 000 0" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [tab, setTab] = useState<"keys" | "webhooks" | "docs">("keys");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Create key
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // Create webhook
  const [whUrl, setWhUrl] = useState("");
  const [whEvent, setWhEvent] = useState("appointment.completed");
  const [creatingWh, setCreatingWh] = useState(false);
  const [whError, setWhError] = useState("");
  const [newWhSecret, setNewWhSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Webhook testing
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; status: number; latencyMs: number; error: string | null }>>({});

  // Confirm dialogs
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<ApiKeyRow | null>(null);
  const [confirmDeleteWh, setConfirmDeleteWh] = useState<WebhookRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // ─── Data fetching ────────────────────────────────────────────────────
  const loadKeys = useCallback(() => {
    fetch("/api/admin/integrations/keys")
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar las API keys");
        return r.json();
      })
      .then((d) => { setKeys(d.keys || []); setLoadError(""); })
      .catch((e: Error) => setLoadError(e.message || "Error de conexión"));
  }, []);

  const loadWebhooks = useCallback(() => {
    fetch("/api/admin/integrations/webhooks")
      .then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los webhooks");
        return r.json();
      })
      .then((d) => { setWebhooks(d.webhooks || []); setLoadError(""); })
      .catch((e: Error) => setLoadError(e.message || "Error de conexión"));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/integrations/keys").then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar las API keys");
        return r.json();
      }),
      fetch("/api/admin/integrations/webhooks").then(async (r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los webhooks");
        return r.json();
      }),
    ])
      .then(([k, w]) => {
        setKeys(k.keys || []);
        setWebhooks(w.webhooks || []);
      })
      .catch((e: Error) => setLoadError(e.message || "Error de conexión"))
      .finally(() => setLoading(false));
  }, []);

  // ─── Create handlers ──────────────────────────────────────────────────
  async function createKey() {
    if (!keyName.trim()) return;
    setCreatingKey(true);
    setKeyError("");
    try {
      const res = await fetch("/api/admin/integrations/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKeyValue(data.key);
        setKeyName("");
        setKeyCopied(false);
        loadKeys();
      } else {
        const d = await res.json().catch(() => ({ message: "No se pudo crear la API key" }));
        setKeyError(d.message || "Error al crear API key");
      }
    } catch {
      setKeyError("Error de conexión");
    } finally {
      setCreatingKey(false);
    }
  }

  async function createWebhook() {
    if (!whUrl.trim()) return;
    setWhError("");

    const trimmed = whUrl.trim();
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        setWhError("La URL debe empezar con http:// o https://");
        return;
      }
    } catch {
      setWhError("URL inválida. Ejemplo: https://tu-servicio.com/webhook");
      return;
    }

    setCreatingWh(true);
    try {
      const res = await fetch("/api/admin/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, event: whEvent }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWhSecret(data.webhook.secret);
        setWhUrl("");
        setSecretCopied(false);
        loadWebhooks();
      } else {
        const d = await res.json().catch(() => ({ message: "No se pudo crear el webhook" }));
        setWhError(d.message || "Error al crear webhook");
      }
    } catch {
      setWhError("Error de conexión");
    } finally {
      setCreatingWh(false);
    }
  }

  // ─── Delete / revoke (con ConfirmDialog en vez de confirm()) ──────────
  async function doRevokeKey() {
    if (!confirmRevokeKey) return;
    setActionLoading(true);
    setActionError("");
    try {
      const r = await fetch(`/api/admin/integrations/keys/${confirmRevokeKey.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "No se pudo revocar la key" }));
        setActionError(d.message || "Error al revocar");
        return;
      }
      setConfirmRevokeKey(null);
      loadKeys();
    } catch {
      setActionError("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  }

  async function doDeleteWebhook() {
    if (!confirmDeleteWh) return;
    setActionLoading(true);
    setActionError("");
    try {
      const r = await fetch(`/api/admin/integrations/webhooks/${confirmDeleteWh.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ message: "No se pudo eliminar" }));
        setActionError(d.message || "Error al eliminar");
        return;
      }
      setConfirmDeleteWh(null);
      loadWebhooks();
    } catch {
      setActionError("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  }

  async function testWebhook(id: string) {
    setTestingId(id);
    try {
      const r = await fetch(`/api/admin/integrations/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await r.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          ok: data.ok ?? false,
          status: data.status ?? 0,
          latencyMs: data.latencyMs ?? 0,
          error: data.error ?? null,
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, status: 0, latencyMs: 0, error: "Error de conexión al backend" },
      }));
    } finally {
      setTestingId(null);
    }
  }

  async function copyToClipboard(text: string, setFlag: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      // fallback: select and prompt (raro en HTTPS moderno)
    }
  }

  const activeKeys = keys.filter((k) => k.active).length;
  const activeWebhooks = webhooks.filter((w) => w.active).length;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-[#e8e2dc]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Integraciones</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Conecta aplicaciones externas como PulStock con API Keys y Webhooks
          </p>
        </div>
        <div className="flex items-start gap-4 sm:gap-8 flex-wrap">
          <div className="flex items-start gap-6 sm:gap-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                API Keys
              </p>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5 tabular-nums">
                {activeKeys}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Webhooks
              </p>
              <p className="text-2xl font-extrabold text-brand mt-0.5 tabular-nums">
                {activeWebhooks}
              </p>
            </div>
          </div>
          <UserAvatarBadge />
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[#e8e2dc] -mt-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: "keys", label: "API Keys", icon: <IconKey /> },
          { key: "webhooks", label: "Webhooks", icon: <IconWebhook /> },
          { key: "docs", label: "Documentación", icon: null },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`shrink-0 relative px-4 py-2 text-sm font-medium transition flex items-center gap-1.5 ${
              tab === t.key ? "text-brand" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.icon && <span className="text-current">{t.icon}</span>}
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* ── Global load error ──────────────────────────────────────── */}
      {loadError && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button
            onClick={() => { setLoading(true); loadKeys(); loadWebhooks(); setLoading(false); }}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          <div className="h-20 rounded-2xl bg-stone-100 animate-pulse" />
          <div className="h-16 rounded-xl bg-stone-100 animate-pulse" />
          <div className="h-16 rounded-xl bg-stone-100 animate-pulse" />
        </div>
      )}

      {/* ── Tab: API KEYS ──────────────────────────────────────────── */}
      {!loading && tab === "keys" && (
        <div className="space-y-4">
          {/* Newly created key banner */}
          {newKeyValue && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-900">API Key creada</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Copia esta key ahora — no se volverá a mostrar por seguridad.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2.5 text-xs font-mono text-stone-800 border border-emerald-200 break-all">
                  {newKeyValue}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyValue, setKeyCopied)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  <IconCopy />
                  {keyCopied ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
              <button
                onClick={() => setNewKeyValue(null)}
                className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Entendido, ya la copié
              </button>
            </div>
          )}

          {/* Create form */}
          <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand"><IconKey /></span>
              <p className="text-sm font-bold text-stone-900">Crear nueva API Key</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              Úsala para autenticar aplicaciones externas que lean datos de MarBrava (ej: PulStock para stock de productos).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input-field flex-1"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Nombre (ej: PulStock Producción)"
                maxLength={80}
                onKeyDown={(e) => { if (e.key === "Enter") createKey(); }}
              />
              <button
                onClick={createKey}
                disabled={creatingKey || !keyName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 shrink-0 disabled:opacity-50"
              >
                <IconPlus />
                {creatingKey ? "Creando..." : "Crear key"}
              </button>
            </div>
            {keyError && <p className="mt-2 text-xs text-red-600">{keyError}</p>}
          </div>

          {/* Keys list */}
          {keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                <IconKey />
              </div>
              <p className="text-base font-bold text-stone-800">Sin API keys aún</p>
              <p className="text-sm text-stone-500 mt-1 max-w-xs mx-auto">
                Crea tu primera key arriba para conectar aplicaciones externas.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden divide-y divide-[#f0ece8]">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className={`flex items-start justify-between gap-3 p-4 ${k.active ? "" : "opacity-50"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-stone-900 truncate">{k.name}</p>
                      {!k.active && (
                        <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          Revocada
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-stone-500 break-all mt-0.5">{k.prefix}…</p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {k.lastUsedAt
                        ? `Último uso: ${new Date(k.lastUsedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Nunca usada"}
                    </p>
                  </div>
                  {k.active && (
                    <button
                      onClick={() => { setConfirmRevokeKey(k); setActionError(""); }}
                      className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 transition"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: WEBHOOKS ──────────────────────────────────────────── */}
      {!loading && tab === "webhooks" && (
        <div className="space-y-4">
          {/* New webhook secret banner */}
          {newWhSecret && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-900">Webhook registrado</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Usa este secret para verificar la firma HMAC-SHA256 de los payloads.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2.5 text-xs font-mono text-stone-800 border border-emerald-200 break-all">
                  {newWhSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(newWhSecret, setSecretCopied)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  <IconCopy />
                  {secretCopied ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
              <button
                onClick={() => setNewWhSecret(null)}
                className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Entendido
              </button>
            </div>
          )}

          {/* Create webhook form */}
          <div className="rounded-2xl border border-[#e8e2dc] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-brand"><IconWebhook /></span>
              <p className="text-sm font-bold text-stone-900">Registrar webhook</p>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              MarBrava enviará POST a esta URL cuando ocurra el evento seleccionado. Firmado con HMAC-SHA256.
            </p>
            <div className="space-y-2">
              <input
                className="input-field"
                value={whUrl}
                onChange={(e) => setWhUrl(e.target.value)}
                placeholder="URL (ej: https://pulstock.cl/api/webhooks/marbrava)"
                maxLength={500}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="input-field flex-1"
                  value={whEvent}
                  onChange={(e) => setWhEvent(e.target.value)}
                >
                  {EVENTS.map((ev) => (
                    <option key={ev.value} value={ev.value}>{ev.label}</option>
                  ))}
                </select>
                <button
                  onClick={createWebhook}
                  disabled={creatingWh || !whUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition shadow-sm shadow-brand/20 shrink-0 disabled:opacity-50"
                >
                  <IconPlus />
                  {creatingWh ? "Creando..." : "Registrar"}
                </button>
              </div>
              {whError && <p className="text-xs text-red-600">{whError}</p>}
            </div>
          </div>

          {/* Webhooks list */}
          {webhooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e8e2dc] bg-white p-10 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                <IconWebhook />
              </div>
              <p className="text-base font-bold text-stone-800">Sin webhooks registrados</p>
              <p className="text-sm text-stone-500 mt-1 max-w-xs mx-auto">
                Registra una URL para recibir eventos automáticamente cuando pase algo en tu barbería.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e8e2dc] bg-white shadow-sm overflow-hidden divide-y divide-[#f0ece8]">
              {webhooks.map((w) => {
                const result = testResults[w.id];
                const eventLabel = EVENTS.find((e) => e.value === w.event)?.label ?? w.event;
                return (
                  <div key={w.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-900 break-all">{w.url}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                            {eventLabel}
                          </span>
                          {!w.active && (
                            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => testWebhook(w.id)}
                          disabled={testingId === w.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-brand disabled:opacity-50 transition"
                        >
                          <IconPlay />
                          {testingId === w.id ? "Probando..." : "Probar"}
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteWh(w); setActionError(""); }}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    {result && (
                      <div
                        className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                          result.ok
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {result.error ? (
                          <span>✗ {result.error}</span>
                        ) : result.ok ? (
                          <span>✓ Respuesta HTTP {result.status} en {result.latencyMs}ms</span>
                        ) : (
                          <span>✗ HTTP {result.status} · {result.latencyMs}ms</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: DOCS ──────────────────────────────────────────────── */}
      {!loading && tab === "docs" && (
        <div className="rounded-2xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Cómo conectar tu aplicación</h2>
            <p className="text-sm text-stone-500 mt-1">
              Ejemplo típico con PulStock u otros integradores.
            </p>
          </div>

          <div className="space-y-5 text-sm text-stone-600">
            <section>
              <h3 className="font-semibold text-stone-900 mb-1">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold mr-2">1</span>
                Crear API Key
              </h3>
              <p className="pl-7">Ve a la pestaña &quot;API Keys&quot; y crea una. Cópiala — solo se muestra una vez.</p>
            </section>

            <section>
              <h3 className="font-semibold text-stone-900 mb-1">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold mr-2">2</span>
                Configurar en tu app
              </h3>
              <p className="pl-7">Usa estos datos para autenticar:</p>
              <div className="mt-2 ml-7 rounded-lg bg-stone-50 border border-[#e8e2dc] p-3 font-mono text-xs space-y-1 overflow-x-auto">
                <p>
                  <span className="text-stone-400">Base URL:</span>{" "}
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/v1
                </p>
                <p>
                  <span className="text-stone-400">Header:</span> Authorization: Bearer mb_live_xxx...
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-stone-900 mb-1">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold mr-2">3</span>
                Endpoints disponibles
              </h3>
              <div className="mt-2 ml-7 rounded-lg bg-stone-50 border border-[#e8e2dc] p-3 font-mono text-xs space-y-2 overflow-x-auto">
                <p>
                  <span className="text-emerald-600 font-semibold">GET</span> /api/v1/services — Listar servicios
                </p>
                <p>
                  <span className="text-emerald-600 font-semibold">GET</span>{" "}
                  /api/v1/appointments?status=DONE&amp;from=ISO&amp;to=ISO — Citas completadas
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-stone-900 mb-1">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white text-[10px] font-bold mr-2">4</span>
                Webhooks (opcional)
              </h3>
              <p className="pl-7">
                Registra una URL en &quot;Webhooks&quot; para recibir eventos automáticos. Payload de ejemplo:
              </p>
              <div className="mt-2 ml-7 rounded-lg bg-stone-50 border border-[#e8e2dc] p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-stone-700 whitespace-pre-wrap">{`{
  "event": "appointment.completed",
  "timestamp": "2026-04-01T10:00:00Z",
  "data": {
    "appointmentId": "cxxx...",
    "serviceName": "Corte Clásico",
    "barberName": "Daniel Silva",
    "price": 12000
  }
}`}</pre>
                <p className="mt-2 text-stone-400">
                  Verificar firma: HMAC-SHA256(body, secret) === X-Webhook-Signature
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ── Confirm dialogs ────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmRevokeKey !== null}
        title="¿Revocar API key?"
        message={
          confirmRevokeKey
            ? `Vas a revocar "${confirmRevokeKey.name}". Las integraciones que la usen dejarán de funcionar inmediatamente.${actionError ? `\n\nError: ${actionError}` : ""}`
            : ""
        }
        confirmLabel="Revocar key"
        variant="danger"
        loading={actionLoading}
        onConfirm={doRevokeKey}
        onClose={() => { setConfirmRevokeKey(null); setActionError(""); }}
      />

      <ConfirmDialog
        open={confirmDeleteWh !== null}
        title="¿Eliminar webhook?"
        message={
          confirmDeleteWh
            ? `Vas a eliminar el webhook para "${confirmDeleteWh.url}". No volverás a recibir notificaciones en esta URL.${actionError ? `\n\nError: ${actionError}` : ""}`
            : ""
        }
        confirmLabel="Eliminar webhook"
        variant="danger"
        loading={actionLoading}
        onConfirm={doDeleteWebhook}
        onClose={() => { setConfirmDeleteWh(null); setActionError(""); }}
      />
    </div>
  );
}
