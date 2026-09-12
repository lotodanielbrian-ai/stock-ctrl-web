import { buildEscPosTicket } from "../utils/escpos";
import { fmtMoney } from "../utils/helpers";
import { INVOICE_TYPES, registerLabel } from "../utils/caja";

const STORAGE_KEY = "sc-printer-prefs";

export function getPrinterPrefs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { mode: "browser", baudRate: 9600 };
}

export function savePrinterPrefs(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function serialSupported() {
  return typeof navigator !== "undefined" && !!navigator.serial;
}

let serialPort = null;

export async function connectSerialPrinter(baudRate = 9600) {
  if (!serialSupported()) {
    throw new Error("Web Serial no está disponible. Usá Chrome/Edge en escritorio.");
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: Number(baudRate) || 9600 });
  serialPort = port;
  return port;
}

export async function disconnectSerialPrinter() {
  if (serialPort) {
    try { await serialPort.close(); } catch { /* ignore */ }
    serialPort = null;
  }
}

export function isSerialConnected() {
  return !!serialPort;
}

async function writeSerial(bytes) {
  if (!serialPort) throw new Error("Impresora térmica no conectada.");
  const writer = serialPort.writable.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
}

export function ticketToEscPos(ticket, extras = {}) {
  const { register, fiscal, openDrawer = false } = extras;
  const typeInfo = INVOICE_TYPES[ticket.invoiceType] || INVOICE_TYPES.ticket;
  const header = [
    fiscal?.razonSocial || "STOCK//CTRL",
    fiscal?.cuit ? `CUIT ${fiscal.cuit}` : "",
    fiscal?.domicilio || "",
    register ? registerLabel(register) : "",
    typeInfo.label.toUpperCase(),
    ticket.ticketNumber,
    new Date(ticket.createdAt || Date.now()).toLocaleString("es-AR"),
  ].filter(Boolean);

  const items = (ticket.lines || []).map((l) => ({
    name: l.productName || l.name,
    qty: l.qty,
    unit: `$${fmtMoney(l.unitPrice ?? l.listPrice)}`,
    total: `$${fmtMoney(l.lineTotal)}`,
    discount: l.discount ? `$${fmtMoney(l.discount)}` : "",
  }));

  const footer = [
    { text: `TOTAL $${fmtMoney(ticket.total)}`, big: true },
    { text: `Pago: ${ticket.paymentLabel || ticket.paymentMethod}` },
  ];
  if (ticket.cashReceived) {
    footer.push({ text: `Paga con $${fmtMoney(ticket.cashReceived)}` });
    footer.push({ text: `Vuelto $${fmtMoney(ticket.changeGiven)}` });
  }
  if (ticket.cae) {
    footer.push({ text: `CAE ${ticket.cae}` });
    if (ticket.caeVto) footer.push({ text: `Vto CAE ${ticket.caeVto}` });
  } else if (typeInfo.fiscal) {
    footer.push({ text: "COMPROBANTE NO FISCAL" });
    footer.push({ text: "Factura electronica no emitida" });
  } else {
    footer.push({ text: "Ticket interno — no valido como factura" });
  }
  footer.push({ text: "Gracias por su compra" });

  return buildEscPosTicket({ headerLines: header, items, footerLines: footer, openDrawer });
}

export async function printThermal(ticket, extras = {}) {
  const bytes = ticketToEscPos(ticket, extras);
  await writeSerial(bytes);
}

export function printBrowserTicket() {
  window.print();
}
