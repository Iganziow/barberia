"use client";

import { useCallback, useEffect, useState } from "react";

type ApiKeyRow = { id: string; name: string; prefix: string; active: boolean; lastUsedAt: string | null; createdAt: string };
type WebhookRow = { id: string; url: string; event: string; active: boolean; createdAt: string };

export default function IntegrationsPage() {
  const [tab, setTab] = useState<"keys" | "webhooks" | "docs">("keys");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create key state
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  // Create webhook state
  const [whUrl, setWhUrl] = useState("");
  const [whEvent, setWhEvent] = useState("appointment.completed");
  const [creatingWh, setCreatingWh] = useState(false);
  const [newWhSecret, setNewWhSecret] = useState<string | null>(null);

  const loadKeys = useCallback(() => {
    fetch("/api/admin/integrations/keys")
      .then((r) => r.ok ? r.json() : { keys: [] })
      .then((d) => setKeys(d.keys || []))
      .catch(() => {});
  }, []);

  const loadWebhooks = useCallback(() => {
    fetch("/api/admin/integrations/webhooks")
      .then((r) => r.ok ? r.json() : { webhooks: [] })
      .then((d) => setWebhooks(d.webhooks || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/integrations/keys").then((r) => r.ok ? r.json() : { keys: [] }),
      fetch("/api/admin/integrations/webhooks").then((r) => r.ok ? r.json() : { webhooks: [] }),
    ]).then(([k, w]) => {
      setKeys(k.keys || []);
      setWebhooks(w.webhooks || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!keyName.trim()) return;
    setCreatingKey(true);
    const res = await fetch("/api/admin/integrations/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKeyValue(data.key);
      setKeyName("");
      loadKeys();
    }
    setCreatingKey(false);
  }

  async function revokeKey(id: string) {
    if (!window.confirm("¿Revocar esta API key? Las integraciones que la usen dejarán de funcionar.")) return;
    await fetch(`/api/admin/integrations/keys/${id}`, { method: "DELETE" });
    loadKeys();
  }

  async function createWebhook() {
    if (!whUrl.trim()) return;
    setCreatingWh(true);
    const res = await fetch("/api/admin/integrations/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: whUrl.trim(), event: whEvent }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewWhSecret(data.webhook.secret);
      setWhUrl("");
      loadWebhooks();
    }
    setCreatingWh(false);
  }

  async function deleteWebhook(id: string) {
    if (!window.confirm("¿Eliminar este webhook?")) return;
    await fetch(`/api/admin/integrations/webhooks/${id}`, { method: "DELETE" });
    loadWebhooks();
  }

  const EVENTS = [
    { value: "appointment.completed", label: "Cita completada" },
    { value: "appointment.canceled", label: "Cita cancelada" },
    { value: "appointment.created", label: "Cita creada" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">Integraciones</h1>
        <p className="text-sm text-stone-500">Conecta aplicaciones externas como PulStock con API Keys y Webhooks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e8e2dc] overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: "keys", label: "API Keys" },
          { key: "webhooks", label: "Webhooks" },
          { key: "docs", label: "Documentación" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition border-b-2 ${
              tab === t.key
                ? "border-[#c87941] text-[#c87941]"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-stone-400 py-12">Cargando...</div>
      ) : tab === "keys" ? (
        <div className="space-y-4">
          {/* New key shown once */}
          {newKeyValue && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800 mb-1">API Key creada</p>
              <p className="text-xs text-emerald-600 mb-2">Copia esta key ahora — no se volverá a mostrar.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-mono text-stone-800 border border-emerald-200 break-all">
                  {newKeyValue}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(newKeyValue); }}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                >
                  Copiar
                </button>
              </div>
              <button onClick={() => setNewKeyValue(null)} className="mt-2 text-xs text-emerald-600 hover:text-emerald-800">
                Entendido, ya la copié
              </button>
            </div>
          )}

          {/* Create key form */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-stone-800 mb-3">Crear nueva API Key</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input-field flex-1"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Nombre (ej: PulStock Producción)"
              />
              <button
                onClick={createKey}
                disabled={creatingKey || !keyName.trim()}
                className="btn-primary text-sm shrink-0"
              >
                {creatingKey ? "Creando..." : "Crear key"}
              </button>
            </div>
          </div>

          {/* Keys list */}
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-stone-100">
                <svg width="20" height="20" fill="none" stroke="#78716c" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
              </div>
              <p className="text-sm font-medium text-stone-500">Sin API keys</p>
              <p className="text-xs text-stone-400 mt-0.5">Crea una key para conectar aplicaciones externas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className={`rounded-xl border bg-white p-4 shadow-sm flex items-start justify-between gap-3 ${k.active ? "border-[#e8e2dc]" : "border-red-100 opacity-50"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{k.name}</p>
                    <p className="text-xs text-stone-400 font-mono break-all">{k.prefix}...</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {k.lastUsedAt ? `Último uso: ${new Date(k.lastUsedAt).toLocaleDateString("es-CL")}` : "Nunca usada"}
                      {!k.active && " · Revocada"}
                    </p>
                  </div>
                  {k.active && (
                    <button onClick={() => revokeKey(k.id)} className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700">
                      Revocar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "webhooks" ? (
        <div className="space-y-4">
          {/* Webhook secret shown once */}
          {newWhSecret && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800 mb-1">Webhook creado</p>
              <p className="text-xs text-emerald-600 mb-2">Usa este secret para verificar la firma HMAC-SHA256 de los payloads.</p>
              <code className="block rounded-lg bg-white px-3 py-2 text-xs font-mono text-stone-800 border border-emerald-200 break-all">
                {newWhSecret}
              </code>
              <button onClick={() => setNewWhSecret(null)} className="mt-2 text-xs text-emerald-600 hover:text-emerald-800">
                Entendido
              </button>
            </div>
          )}

          {/* Create webhook form */}
          <div className="rounded-xl border border-[#e8e2dc] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-stone-800 mb-3">Registrar webhook</p>
            <div className="space-y-2">
              <input
                className="input-field"
                value={whUrl}
                onChange={(e) => setWhUrl(e.target.value)}
                placeholder="URL (ej: https://pulstock.cl/api/webhooks/marbrava)"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <select className="input-field flex-1" value={whEvent} onChange={(e) => setWhEvent(e.target.value)}>
                  {EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
                <button
                  onClick={createWebhook}
                  disabled={creatingWh || !whUrl.trim()}
                  className="btn-primary text-sm shrink-0"
                >
                  {creatingWh ? "Creando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Webhooks list */}
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-stone-500">Sin webhooks</p>
              <p className="text-xs text-stone-400 mt-0.5">Registra una URL para recibir eventos automáticamente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-xl border border-[#e8e2dc] bg-white p-4 shadow-sm flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-800 break-all">{w.url}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {EVENTS.find((e) => e.value === w.event)?.label ?? w.event}
                    </p>
                  </div>
                  <button onClick={() => deleteWebhook(w.id)} className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Docs tab */
        <div className="rounded-xl border border-[#e8e2dc] bg-white p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-stone-900">Cómo conectar PulStock</h2>

          <div className="space-y-4 text-sm text-stone-600">
            <div>
              <h3 className="font-semibold text-stone-800 mb-1">1. Crear API Key</h3>
              <p>Ve a la pestaña &quot;API Keys&quot; y crea una key. Cópiala — solo se muestra una vez.</p>
            </div>

            <div>
              <h3 className="font-semibold text-stone-800 mb-1">2. Configurar en PulStock</h3>
              <p>En PulStock, configura la conexión con MarBrava usando:</p>
              <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs overflow-x-auto space-y-1">
                <p><span className="text-stone-400">Base URL:</span> {typeof window !== "undefined" ? window.location.origin : ""}/api/v1</p>
                <p><span className="text-stone-400">Header:</span> Authorization: Bearer mb_live_xxx...</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-stone-800 mb-1">3. Endpoints disponibles</h3>
              <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs overflow-x-auto space-y-2">
                <p><span className="text-emerald-600">GET</span> /api/v1/services — Listar servicios</p>
                <p><span className="text-emerald-600">GET</span> /api/v1/appointments?status=DONE&amp;from=ISO&amp;to=ISO — Citas completadas</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-stone-800 mb-1">4. Webhooks (opcional)</h3>
              <p>Registra una URL en la pestaña &quot;Webhooks&quot; para recibir eventos automáticos cuando se completa o cancela una cita.</p>
              <div className="mt-2 rounded-lg bg-stone-50 p-3 font-mono text-xs overflow-x-auto">
                <p className="text-stone-400">Payload de ejemplo:</p>
                <pre className="mt-1 text-stone-700">{`{
  "event": "appointment.completed",
  "timestamp": "2026-04-01T10:00:00Z",
  "data": {
    "appointmentId": "cxxx...",
    "serviceName": "Corte Clásico",
    "barberName": "Daniel Silva",
    "price": 12000
  }
}`}</pre>
                <p className="mt-2 text-stone-400">Verificar firma: HMAC-SHA256(body, secret) === X-Webhook-Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
