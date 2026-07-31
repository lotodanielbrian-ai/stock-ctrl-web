import * as XLSX from "xlsx";

export const STORAGE_KEY = "stockctrl-data-v1";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/* Date utilities for filtering */
export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function startOfWeek(d) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
export function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }
export function startOfYear(d) { const x = startOfDay(d); x.setMonth(0, 1); return x; }

export function periodRange(period, ref = new Date()) {
  const now = ref;
  let start, prevStart, prevEnd;
  if (period === "dia") {
    start = startOfDay(now);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(start);
  } else if (period === "semana") {
    start = startOfWeek(now);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(start);
  } else if (period === "mes") {
    start = startOfMonth(now);
    prevStart = new Date(start); prevStart.setMonth(prevStart.getMonth() - 1);
    prevEnd = new Date(start);
  } else { // anio
    start = startOfYear(now);
    prevStart = new Date(start); prevStart.setFullYear(prevStart.getFullYear() - 1);
    prevEnd = new Date(start);
  }
  return { start, end: now, prevStart, prevEnd };
}

export function saleRevenue(sale) {
  return (Number(sale.unitPrice) || 0) * (Number(sale.qty) || 0);
}
export function saleCost(sale) {
  return (Number(sale.costPrice) || 0) * (Number(sale.qty) || 0);
}

export function resizeImage(file, maxWidth = 360, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function stockLevel(product) {
  const min = Number(product.minStock) || 5;
  const qty = Number(product.quantity) || 0;
  const orangeAt = Math.max(1, Math.round(min * 0.6));
  const redAt = Math.max(0, Math.round(min * 0.2));
  if (qty <= 0) return "agotado";
  if (qty <= redAt) return "critico";
  if (qty <= orangeAt) return "medio";
  if (qty <= min) return "bajo";
  return "sano";
}

export const LEVEL_COLOR = {
  agotado: "var(--red)",
  critico: "var(--red)",
  medio: "var(--orange)",
  bajo: "var(--amber)",
  sano: "var(--green)",
};

export const LEVEL_LABEL = {
  agotado: "AGOTADO",
  critico: "CRÍTICO",
  medio: "MEDIO",
  bajo: "BAJO",
  sano: "SANO",
};

import { getPaymentInfo } from "./paymentMethods";

export function exportSalesToExcel(sales, products) {
  const data = sales.map((s) => {
    const prod = products.find((p) => p.id === s.productId);
    const rev = saleRevenue(s);
    const cost = saleCost(s);
    return {
      ID: s.id,
      Fecha: fmtDate(s.date),
      Producto: prod ? prod.name : s.productName || "Desconocido",
      Código: prod ? prod.barcode : "-",
      Vendedor: s.userName || "N/A",
      Cantidad: s.qty,
      "Precio Unitario ($)": s.unitPrice,
      "Costo Unitario ($)": s.costPrice,
      "Medio de Pago": getPaymentInfo(s.paymentMethod || "efectivo").label,
      "Total Venta ($)": rev,
      "Total Costo ($)": cost,
      "Ganancia ($)": rev - cost,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Historial de Ventas");
  XLSX.writeFile(wb, `Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProductsToExcel(products) {
  const data = products.map((p) => {
    const lvl = stockLevel(p);
    return {
      ID: p.id,
      "Nombre Producto": p.name,
      Categoría: p.category || "General",
      "Código de Barras": p.barcode || "-",
      "Stock Actual": p.quantity,
      "Stock Mínimo": p.minStock,
      "Estado Stock": LEVEL_LABEL[lvl],
      "Precio Costo ($)": p.costPrice,
      "Precio Venta ($)": p.publicPrice,
      "Valor en Góndola ($)": p.quantity * p.publicPrice,
      "Última Reposición": fmtDate(p.lastRestock),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario de Productos");
  XLSX.writeFile(wb, `Inventario_Productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
