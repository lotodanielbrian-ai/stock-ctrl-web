export const LOCATIONS = {
  local1: "Local 1",
  local2: "Local 2",
  deposito: "Depósito",
};

export function locationLabel(key) {
  return LOCATIONS[key] || "Local 1";
}

export function stockFieldForLocation(loc) {
  if (loc === "local2") return "stockLocal2";
  if (loc === "deposito") return "stockDeposito";
  return "stockLocal1";
}

export function registerLabel(reg) {
  if (!reg) return "—";
  return `[${reg.number}]${reg.name}`;
}

export const INVOICE_TYPES = {
  ticket: { key: "ticket", label: "Ticket interno", fiscal: false },
  factura_a: { key: "factura_a", label: "Factura A", fiscal: true },
  factura_b: { key: "factura_b", label: "Factura B", fiscal: true },
  factura_c: { key: "factura_c", label: "Factura C", fiscal: true },
};

export const AR_BILLS = [20000, 10000, 2000, 1000, 500, 200, 100, 50, 20, 10];
export const AR_COINS = [10, 5, 2, 1];

export function lineNetUnit(line) {
  const price = Number(line.listPrice) || 0;
  const val = Number(line.discountValue) || 0;
  if (line.discountType === "percent") return Math.max(0, price * (1 - val / 100));
  return Math.max(0, price - val);
}

export function lineTotal(line) {
  return roundMoney(lineNetUnit(line) * (Number(line.qty) || 0));
}

export function lineDiscountAmount(line) {
  const price = Number(line.listPrice) || 0;
  const qty = Number(line.qty) || 0;
  return roundMoney(Math.max(0, price * qty - lineTotal(line)));
}

export function ticketTotals(lines) {
  const subtotal = roundMoney(lines.reduce((acc, l) => acc + (Number(l.listPrice) || 0) * (Number(l.qty) || 0), 0));
  const discount = roundMoney(lines.reduce((acc, l) => acc + lineDiscountAmount(l), 0));
  const total = roundMoney(subtotal - discount);
  return { subtotal, discount, total };
}

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function expectedCash(session, movements) {
  if (!session) return 0;
  const sessionMoves = (movements || []).filter((m) => m.sessionId === session.id && m.type !== "opening_float");
  let n = Number(session.openingFloat) || 0;
  for (const m of sessionMoves) {
    if (m.type === "cash_sale" || m.type === "deposit") n += Number(m.amount) || 0;
    if (m.type === "withdrawal" || m.type === "expense") n -= Number(m.amount) || 0;
  }
  return roundMoney(n);
}

export function countArqueo(counts) {
  let total = 0;
  for (const [denom, qty] of Object.entries(counts || {})) {
    total += (Number(denom) || 0) * (Number(qty) || 0);
  }
  return roundMoney(total);
}

export function nextTicketNumber(tickets, prefix = "T") {
  const nums = (tickets || [])
    .map((t) => {
      const m = String(t.ticketNumber || "").match(/(\d+)$/);
      return m ? Number(m[1]) : 0;
    });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}

export function emptyArqueoCounts() {
  const counts = {};
  [...AR_BILLS, ...AR_COINS].forEach((d) => { counts[String(d)] = 0; });
  return counts;
}

export const DEFAULT_REGISTERS = [
  { id: "reg-01", number: "01", name: "CAJA1", location: "local1", isActive: true, afipPuntoVenta: 1 },
  { id: "reg-02", number: "02", name: "CAJA2", location: "local2", isActive: true, afipPuntoVenta: 2 },
  { id: "reg-03", number: "03", name: "CAJA-DEP", location: "deposito", isActive: true, afipPuntoVenta: 3 },
];

export const DEFAULT_FISCAL = {
  cuit: "",
  razonSocial: "",
  condicionIva: "monotributo",
  iibb: "",
  domicilio: "",
  afipEnabled: false,
  afipAmbiente: "homologacion",
  puntoVentaDefault: 1,
};

export function formatRegisterNumber(n) {
  return String(n || "01").padStart(2, "0");
}

export function foldText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
