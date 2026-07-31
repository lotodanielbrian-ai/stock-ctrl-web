import React from "react";
import { stockLevel, LEVEL_COLOR, LEVEL_LABEL } from "../utils/helpers";

export function GaugeBar({ product, max }) {
  const qty = Number(product.quantity) || 0;
  const pct = max > 0 ? Math.min(100, (qty / max) * 100) : 0;
  const color = LEVEL_COLOR[stockLevel(product)];

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        height: 8,
        borderRadius: 4,
        background: "var(--panel-alt)",
        border: "1px solid var(--border-soft)",
        overflow: "hidden",
      }}>
        <div className="sc-anim" style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          transition: "width .3s ease",
          borderRadius: 4,
        }} />
      </div>
    </div>
  );
}

export function LevelBadge({ level }) {
  const color = LEVEL_COLOR[level] || "var(--text-dim)";
  return (
    <span className="sc-mono" style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color,
      border: `1px solid ${color}55`,
      background: `${color}1A`,
      padding: "3px 7px",
      borderRadius: 4,
      whiteSpace: "nowrap",
    }}>
      {LEVEL_LABEL[level] || level}
    </span>
  );
}

export function ProductThumb({ product, size = 40 }) {
  return product.photo ? (
    <img src={product.photo} alt={product.name} style={{
      width: size,
      height: size,
      objectFit: "cover",
      borderRadius: 6,
      border: "1px solid var(--border)",
    }} />
  ) : (
    <div style={{
      width: size,
      height: size,
      borderRadius: 6,
      background: "var(--panel-alt)",
      border: "1px solid var(--border)",
      display: "grid",
      placeItems: "center",
      color: "var(--text-faint)",
      fontSize: size * 0.4,
      fontWeight: "bold",
    }}>
      {product.name ? product.name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

export function EmptyState({ text, icon: Icon }) {
  return (
    <div style={{
      border: "1px dashed var(--border)",
      borderRadius: 9,
      padding: "40px 20px",
      textAlign: "center",
      color: "var(--text-faint)",
      margin: "12px 0",
    }}>
      {Icon && <Icon size={26} style={{ marginBottom: 10, opacity: 0.6 }} />}
      <div style={{ fontSize: 13, maxWidth: 380, margin: "0 auto" }}>{text}</div>
    </div>
  );
}
