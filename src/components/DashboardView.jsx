import React, { useState, useMemo } from "react";
import { Boxes, Package, AlertTriangle, DollarSign, ArrowUpDown, Search, FileSpreadsheet } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { HelpTag } from "./HelpTag";
import { GaugeBar, LevelBadge, ProductThumb, EmptyState } from "./GaugeBar";
import { stockLevel, fmtMoney, fmtDate, exportProductsToExcel } from "../utils/helpers";
import { useData } from "../contexts/DataContext";

export function DashboardView({ canSeeCost }) {
  const { products } = useData();
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    const f = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.includes(search))
    );
    return [...f].sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));
  }, [products, search]);

  const maxQty = useMemo(() => Math.max(1, ...products.map((p) => Number(p.quantity) || 0)), [products]);

  const totalUnits = products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const lowCount = products.filter((p) => ["bajo", "medio", "critico", "agotado"].includes(stockLevel(p))).length;
  const totalValuePublic = products.reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.publicPrice) || 0), 0);

  const inputStyle = {
    width: "100%",
    background: "var(--panel-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 11px",
    color: "var(--text)",
    fontSize: 13.5,
  };

  return (
    <div className="sc-fadein">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard icon={Boxes} label="PRODUCTOS REGISTRADOS" value={products.length} />
        <KpiCard icon={Package} label="UNIDADES TOTALES" value={totalUnits.toLocaleString("es-AR")} />
        <KpiCard icon={AlertTriangle} label="ALERTAS DE STOCK" value={lowCount} accent={lowCount ? "var(--red)" : "var(--green)"} />
        <KpiCard icon={DollarSign} label="VALOR EN GÓNDOLA" value={`$${fmtMoney(totalValuePublic)}`} accent="var(--cyan)" />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div className="sc-display" style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <ArrowUpDown size={15} color="var(--text-dim)" /> Stock — de menor a mayor
          <HelpTag text="Vista general del inventario ordenada de menor a mayor stock. Los KPIs de arriba resumen productos, unidades, alertas y valor en góndola." />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => exportProductsToExcel(products)}
            className="sc-btn sc-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--panel-alt)",
              border: "1px solid var(--border)",
              color: "var(--green)",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={14} /> Exportar Inventario
          </button>

          <div style={{ position: "relative" }}>
            <Search size={13} color="var(--text-faint)" style={{ position: "absolute", left: 10, top: 11 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código..."
              className="sc-focus"
              style={{ ...inputStyle, width: 220, paddingLeft: 30, fontSize: 12.5 }}
            />
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState text="Todavía no cargaste productos. Agregalos desde el panel de Productos para verlos acá." />
      ) : (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                  {["", "PRODUCTO", "CATEGORÍA", "STOCK", "NIVEL", canSeeCost ? "COSTO" : null, "PÚBLICO", "ÚLTIMA CARGA"]
                    .filter(Boolean)
                    .map((h, i) => (
                      <th key={i} className="sc-mono" style={{
                        textAlign: "left",
                        padding: "11px 14px",
                        fontSize: 10,
                        color: "var(--text-faint)",
                        letterSpacing: "0.06em",
                        fontWeight: 600,
                      }}>{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const level = stockLevel(p);
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-soft)", transition: "background .15s ease" }}>
                      <td style={{ padding: "9px 0 9px 14px", width: 44 }}>
                        <ProductThumb product={p} size={34} />
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 13, fontWeight: 500 }}>
                        <div>{p.name}</div>
                        {p.barcode && <div className="sc-mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{p.barcode}</div>}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12, color: "var(--text-dim)" }}>
                        {p.category || "Sin categoría"}
                      </td>
                      <td style={{ padding: "9px 14px", width: 170 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="sc-mono" style={{ fontSize: 13, fontWeight: 700, width: 28 }}>{p.quantity}</span>
                          <div style={{ width: 90 }}><GaugeBar product={p} max={maxQty} /></div>
                        </div>
                      </td>
                      <td style={{ padding: "9px 14px" }}><LevelBadge level={level} /></td>
                      {canSeeCost && (
                        <td className="sc-mono" style={{ padding: "9px 14px", fontSize: 12.5, color: "var(--text-dim)" }}>
                          ${fmtMoney(p.costPrice)}
                        </td>
                      )}
                      <td className="sc-mono" style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--cyan)" }}>
                        ${fmtMoney(p.publicPrice)}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 11.5, color: "var(--text-faint)" }}>
                        {fmtDate(p.lastRestock)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
