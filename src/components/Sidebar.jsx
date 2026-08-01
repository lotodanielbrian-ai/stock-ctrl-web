import React, { useState } from "react";
import {
  Package, AlertTriangle, ShoppingCart, ClipboardList, Users, LogOut,
  ChevronsLeft, ChevronsRight, BarChart3, Wallet, Boxes, Palette
} from "lucide-react";

export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: Package, roles: ["admin", "vendedor"] },
  { key: "venta", label: "Registrar venta", icon: ShoppingCart, roles: ["admin", "vendedor"] },
  { key: "reposicion", label: "Reposición", icon: AlertTriangle, roles: ["admin", "vendedor"] },
  { key: "productos", label: "Productos", icon: Boxes, roles: ["admin"] },
  { key: "historial", label: "Historial", icon: ClipboardList, roles: ["admin", "vendedor"] },
  { key: "estadisticas", label: "Estadísticas", icon: BarChart3, roles: ["admin"] },
  { key: "nomina", label: "Nómina", icon: Wallet, roles: ["admin"] },
  { key: "usuarios", label: "Usuarios", icon: Users, roles: ["admin"] },
];

export function Sidebar({ view, setView, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? 68 : 220;

  const [theme, setTheme] = useState(() => localStorage.getItem("sc-theme") || "dark");

  React.useEffect(() => {
    if (theme === "pink") {
      document.body.classList.add("theme-pink");
    } else {
      document.body.classList.remove("theme-pink");
    }
    localStorage.setItem("sc-theme", theme);
  }, [theme]);


  return (
    <div style={{
      width: w,
      minWidth: w,
      background: "var(--panel)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: collapsed ? "18px 10px" : "18px 12px",
      transition: "width .18s ease, padding .18s ease",
      overflow: "hidden",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        gap: 9,
        padding: "0 2px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, overflow: "hidden" }}>
          <div style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: 7,
            background: "#45D9C71A",
            border: "1px solid #45D9C755",
            display: "grid",
            placeItems: "center",
          }}>
            <Boxes size={16} color="var(--cyan)" />
          </div>
          {!collapsed && (
            <div className="sc-display" style={{ fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>
              STOCK<span style={{ color: "var(--cyan)" }}>//</span>CTRL
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="sc-btn sc-focus"
            title="Contraer menú"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              width: 24,
              height: 24,
              minWidth: 24,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--text-faint)",
            }}
          >
            <ChevronsLeft size={13} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="sc-btn sc-focus"
          title="Expandir menú"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 6,
            width: "100%",
            height: 26,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            color: "var(--text-faint)",
            marginBottom: 14,
          }}
        >
          <ChevronsRight size={13} />
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV_ITEMS.filter((n) => n.roles.includes(user.role)).map((item) => {
          const Icon = item.icon;
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className="sc-btn sc-focus"
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                padding: collapsed ? "10px 0" : "9px 10px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--panel-alt)" : "transparent",
                color: active ? "var(--text)" : "var(--text-dim)",
                borderLeft: active ? "3px solid var(--cyan)" : "3px solid transparent",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        borderTop: "1px solid var(--border-soft)",
        paddingTop: 12,
        marginTop: 12,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          padding: collapsed ? "0 0 10px" : "0 4px 10px",
        }}>
          <div title={collapsed ? user.name : undefined} style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: "50%",
            background: "var(--panel-alt)",
            border: "1px solid var(--border)",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--cyan)",
          }}>
            {user.name ? user.name.slice(0, 1).toUpperCase() : "U"}
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div className="sc-mono" style={{ fontSize: 9.5, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                {user.role === "admin" ? "ADMINISTRADOR" : "CARGA DE VENTAS"}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setTheme(theme === 'pink' ? 'dark' : 'pink')} className="sc-btn sc-focus" title={collapsed ? "Cambiar Skin" : undefined} style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          padding: collapsed ? "8px 0" : "8px 10px",
          borderRadius: 7,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-dim)",
          fontSize: 12.5,
          cursor: "pointer",
          marginBottom: 6,
        }}>
          <Palette size={13} style={{ flexShrink: 0 }} /> {!collapsed && (theme === 'pink' ? "Skin: Pink" : "Skin: Dark")}
        </button>
        <button onClick={onLogout} className="sc-btn sc-focus" title={collapsed ? "Cerrar sesión" : undefined} style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8,
          padding: collapsed ? "8px 0" : "8px 10px",
          borderRadius: 7,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-dim)",
          fontSize: 12.5,
          cursor: "pointer",
        }}>
          <LogOut size={13} style={{ flexShrink: 0 }} /> {!collapsed && "Cerrar sesión"}
        </button>
      </div>
    </div>
  );
}
