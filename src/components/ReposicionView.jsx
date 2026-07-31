import React, { useState } from "react";
import { ShieldCheck, RefreshCw, Check, X } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { ProductThumb, LevelBadge, EmptyState } from "./GaugeBar";
import { stockLevel, LEVEL_COLOR } from "../utils/helpers";
import { useData } from "../contexts/DataContext";

export function ReposicionView({ isAdmin }) {
  const { products, handleRestock } = useData();
  const needsRestock = products
    .filter((p) => ["bajo", "medio", "critico", "agotado"].includes(stockLevel(p)))
    .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));

  const [restockId, setRestockId] = useState(null);
  const [amount, setAmount] = useState("");

  const confirm = (p) => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    handleRestock(p.id, n);
    setRestockId(null);
    setAmount("");
  };

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
    <div className="sc-fadein" style={{ maxWidth: 760 }}>
      <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
        Panel de reposición
        <HelpTag text="Lista automática de productos que alcanzaron o cayeron por debajo de su stock mínimo configurado. Permite actualizar el inventario agregando nuevas unidades recibidas de proveedores." />
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 18 }}>
        Productos que necesitan restock inmediato ordenados según urgencia.
      </p>

      {needsRestock.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="¡Excelente! No hay productos por reponer en este momento. Todo el inventario está por encima de su mínimo requerido." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {needsRestock.map((p) => {
            const lvl = stockLevel(p);
            const color = LEVEL_COLOR[lvl];
            return (
              <div key={p.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "var(--panel)",
                border: `1px solid ${color}44`,
                borderRadius: 9,
                padding: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}>
                <ProductThumb product={p} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                    <LevelBadge level={lvl} />
                  </div>
                  <div className="sc-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 3 }}>
                    Stock actual: <strong style={{ color }}>{p.quantity} u.</strong> · Stock mínimo configurado: {p.minStock} u.
                  </div>
                </div>

                {isAdmin ? (
                  restockId === p.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        autoFocus
                        type="number"
                        min={1}
                        value={amount}
                        placeholder="cant."
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") confirm(p); }}
                        className="sc-focus sc-mono"
                        style={{ ...inputStyle, width: 85, padding: "7px 9px", textAlign: "center" }}
                      />
                      <button onClick={() => confirm(p)} className="sc-btn sc-focus" title="Confirmar reposición" style={{
                        background: "var(--green)",
                        border: "none",
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                      }}>
                        <Check size={15} color="#0A1210" />
                      </button>
                      <button onClick={() => { setRestockId(null); setAmount(""); }} className="sc-btn sc-focus" title="Cancelar" style={{
                        background: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        width: 32,
                        height: 32,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        color: "var(--text-dim)",
                      }}>
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRestockId(p.id)} className="sc-btn sc-focus" style={{
                      background: "var(--panel-alt)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      borderRadius: 7,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}>
                      <RefreshCw size={13} color="var(--cyan)" /> Reponer stock
                    </button>
                  )
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontStyle: "italic" }}>
                    Solo Administrador
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
