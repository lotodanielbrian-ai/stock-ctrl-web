import { supabase, isSupabaseConfigured } from "../lib/supabase";

function mapRegister(r) {
  return {
    id: r.id,
    number: r.number,
    name: r.name,
    location: r.location,
    isActive: r.is_active !== false,
    afipPuntoVenta: r.afip_punto_venta || 1,
  };
}

function mapSession(s) {
  return {
    id: s.id,
    registerId: s.register_id,
    userId: s.user_id,
    userName: s.user_name,
    openedAt: s.opened_at,
    closedAt: s.closed_at,
    openingFloat: Number(s.opening_float) || 0,
    expectedCash: Number(s.expected_cash) || 0,
    countedCash: s.counted_cash == null ? null : Number(s.counted_cash),
    difference: s.difference == null ? null : Number(s.difference),
    notes: s.notes || "",
    status: s.status,
  };
}

function mapMovement(m) {
  return {
    id: m.id,
    sessionId: m.session_id,
    type: m.type,
    amount: Number(m.amount) || 0,
    note: m.note || "",
    createdAt: m.created_at,
  };
}

function mapTicket(t) {
  return {
    id: t.id,
    ticketNumber: t.ticket_number,
    registerId: t.register_id,
    sessionId: t.session_id,
    userId: t.user_id,
    userName: t.user_name,
    paymentMethod: t.payment_method,
    paymentDetail: t.payment_detail || "",
    subtotal: Number(t.subtotal) || 0,
    discountTotal: Number(t.discount_total) || 0,
    total: Number(t.total) || 0,
    cashReceived: Number(t.cash_received) || 0,
    changeGiven: Number(t.change_given) || 0,
    invoiceType: t.invoice_type || "ticket",
    customerName: t.customer_name || "",
    customerDocType: t.customer_doc_type || "",
    customerDoc: t.customer_doc || "",
    cae: t.cae || "",
    caeVto: t.cae_vto || "",
    invoiceNumber: t.invoice_number || "",
    fiscalStatus: t.fiscal_status || "none",
    createdAt: t.created_at,
  };
}

export async function getRegisters() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from("cash_registers").select("*").order("number");
  if (error) throw error;
  return (data || []).map(mapRegister);
}

export async function upsertRegister(payload) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const row = {
    id: payload.id,
    number: payload.number,
    name: payload.name,
    location: payload.location,
    is_active: payload.isActive !== false,
    afip_punto_venta: payload.afipPuntoVenta || 1,
  };
  const { data, error } = await supabase.from("cash_registers").upsert(row).select("*").single();
  if (error) throw new Error(error.message);
  return mapRegister(data);
}

export async function deleteRegister(id) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const { error } = await supabase.from("cash_registers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSessions() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(mapSession);
}

export async function getMovements() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map(mapMovement);
}

export async function getTickets() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map(mapTicket);
}

export async function openSessionRpc({ registerId, openingFloat }) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("open_cash_session", {
    p_register_id: registerId,
    p_opening_float: openingFloat,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function closeSessionRpc({ sessionId, countedCash, notes }) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("close_cash_session", {
    p_session_id: sessionId,
    p_counted_cash: countedCash,
    p_notes: notes || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function addMovementRpc({ sessionId, type, amount, note }) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("add_cash_movement", {
    p_session_id: sessionId,
    p_type: type,
    p_amount: amount,
    p_note: note || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function registerTicketRpc(payload) {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.rpc("register_ticket", {
    p_items: payload.items,
    p_payment_method: payload.paymentMethod,
    p_payment_detail: payload.paymentDetail || "",
    p_register_id: payload.registerId,
    p_session_id: payload.sessionId,
    p_cash_received: payload.cashReceived || 0,
    p_change_given: payload.changeGiven || 0,
    p_invoice_type: payload.invoiceType || "ticket",
    p_customer_name: payload.customerName || "",
    p_customer_doc_type: payload.customerDocType || "",
    p_customer_doc: payload.customerDoc || "",
    p_ticket_number: payload.ticketNumber,
    p_subtotal: payload.subtotal,
    p_discount_total: payload.discountTotal,
    p_total: payload.total,
    p_fiscal_status: payload.fiscalStatus || "none",
    p_cae: payload.cae || "",
    p_cae_vto: payload.caeVto || "",
    p_invoice_number: payload.invoiceNumber || "",
  });
  if (error) throw new Error(error.message);
  return data;
}

export function isMissingCajaSchema(error) {
  const msg = String(error?.message || error || "");
  return (
    msg.includes("cash_registers") ||
    msg.includes("cash_sessions") ||
    msg.includes("register_ticket") ||
    msg.includes("open_cash_session") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table") ||
    msg.includes("function public.")
  );
}
