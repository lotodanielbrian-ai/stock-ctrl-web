import React from "react";

export function KpiCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: 9,
      padding: "14px 16px",
      flex: 1,
      minWidth: 150,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {Icon && <Icon size={14} color={accent || "var(--text-dim)"} />}
        <span className="sc-mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div className="sc-mono" style={{ fontSize: 22, fontWeight: 700, color: accent || "var(--text)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
