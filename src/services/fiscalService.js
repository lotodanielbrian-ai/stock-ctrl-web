import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { DEFAULT_FISCAL } from "../utils/caja";

function mapFiscal(row) {
  if (!row) return { ...DEFAULT_FISCAL };
  return {
    cuit: row.cuit || "",
    razonSocial: row.razon_social || "",
    condicionIva: row.condicion_iva || "monotributo",
    iibb: row.iibb || "",
    domicilio: row.domicilio || "",
    afipEnabled: !!row.afip_enabled,
    afipAmbiente: row.afip_ambiente || "homologacion",
    puntoVentaDefault: Number(row.punto_venta_default) || 1,
  };
}

export async function getFiscalSettings() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("fiscal_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return mapFiscal(data);
}

export async function saveFiscalSettings(payload) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const row = {
    id: 1,
    cuit: payload.cuit || "",
    razon_social: payload.razonSocial || "",
    condicion_iva: payload.condicionIva || "monotributo",
    iibb: payload.iibb || "",
    domicilio: payload.domicilio || "",
    afip_enabled: !!payload.afipEnabled,
    afip_ambiente: payload.afipAmbiente || "homologacion",
    punto_venta_default: payload.puntoVentaDefault || 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("fiscal_settings").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return mapFiscal(data);
}

/**
 * Attempts electronic invoice issuance via /api/afip-invoice.
 * Without certificates the API returns NOT_CONFIGURED — caller must
 * keep the sale as an internal ticket / non-fiscal invoice.
 */
export async function requestAfipInvoice(payload) {
  try {
    const res = await fetch("/api/afip-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        code: data.code || "HTTP_ERROR",
        message: data.message || "No se pudo emitir la factura electrónica.",
      };
    }
    return { ok: true, ...data };
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: e.message || "Sin conexión con el servicio AFIP.",
    };
  }
}
