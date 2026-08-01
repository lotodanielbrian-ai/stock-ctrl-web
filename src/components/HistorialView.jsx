import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, FileSpreadsheet, Printer, Calendar, Users, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { EmptyState } from "./GaugeBar";
import { fmtMoney, fmtDate, saleRevenue, saleCost, exportSalesToExcel } from "../utils/helpers";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { PaymentBadge } from "./PaymentSelector";
import * as saleService from "../services/saleService";

export function HistorialView() {
  const { products, users, isOnline, sales: localSales } = useData();
  const { currentUser, isAdmin } = useAuth();

  const [filterPeriod, setFilterPeriod] = useState("mes"); // "hoy" | "semana" | "mes" | "todo"
  const [filterUser, setFilterUser] = useState(isAdmin ? "all" : currentUser.id);
  const [filterPayment, setFilterPayment] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  const [sales, setSales] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // When online, fetch sales from Supabase. When offline, use local data and filter manually.
  const fetchSales = useCallback(async () => {
    if (isOnline) {
      setLoading(true);
      try {
        const result = await saleService.getSales({
          period: filterPeriod,
          userId: filterUser,
          paymentMethod: filterPayment,
          search,
          page,
          pageSize,
        });
        setSales(result.sales);
        setTotalCount(result.count);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  }, [filterPeriod, filterUser, filterPayment, search, page, isOnline]);

  useEffect(() => {
    if (isOnline) {
      fetchSales();
    }
  }, [fetchSales, isOnline]);

  const filteredLocalSales = useMemo(() => {
    if (isOnline) return []; // Ignore local when online
    
    return localSales.filter((s) => {
      // Period filter
      if (filterPeriod !== "todo") {
        const d = new Date(s.date);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (filterPeriod === "hoy" && d < startOfDay) return false;
        
        if (filterPeriod === "semana") {
          const start = new Date(startOfDay);
          const day = (start.getDay() + 6) % 7;
          start.setDate(start.getDate() - day);
          if (d < start) return false;
        }
        
        if (filterPeriod === "mes") {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          if (d < start) return false;
        }
      }
      
      // User filter
      if (filterUser !== "all" && s.userId !== filterUser) return false;
      
      // Payment filter
      if (filterPayment !== "all" && s.paymentMethod !== filterPayment) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const prod = products.find((p) => p.id === s.productId);
        const pName = prod ? prod.name : s.productName || "";
        const uName = s.userName || "";
        if (!pName.toLowerCase().includes(q) && !uName.toLowerCase().includes(q) && !s.id.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [localSales, products, filterPeriod, filterUser, filterPayment, search, isOnline]);

  const displayedSales = isOnline ? sales : filteredLocalSales.slice((page - 1) * pageSize, page * pageSize);
  const currentTotal = isOnline ? totalCount : filteredLocalSales.length;

  const totalRevenue = useMemo(() => {
    const list = isOnline ? sales : filteredLocalSales;
    return list.reduce((acc, s) => acc + saleRevenue(s), 0);
  }, [sales, filteredLocalSales, isOnline]);
  
  const totalCost = useMemo(() => {
    const list = isOnline ? sales : filteredLocalSales;
    return list.reduce((acc, s) => acc + saleCost(s), 0);
  }, [sales, filteredLocalSales, isOnline]);
  
  const totalProfit = totalRevenue - totalCost;

  const handlePrint = () => {
    window.print();
  };

  const inputStyle = {
    background: "var(--panel-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 11px",
    color: "var(--text)",
    fontSize: 12.5,
  };

  return (
    <div className="sc-fadein">
      {/* Hidden print template */}
      <div id="sc-print-area">
        <h2 style={{ fontSize: 18, marginBottom: 5 }}>STOCK//CTRL — Reporte de Ventas</h2>
        <p style={{ fontSize: 12, marginBottom: 15 }}>
          Generado el: {new Date().toLocaleString("es-AR")} | Período: {filterPeriod.toUpperCase()}
        </p>
        <table>
          <thead>
            <tr>
              <th>FECHA</th>
              <th>PRODUCTO</th>
              <th>VENDEDOR</th>
              <th>CANTIDAD</th>
              <th>PRECIO UNIT.</th>
              <th>MEDIO DE PAGO</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(isOnline ? sales : filteredLocalSales).map((s) => {
              const prod = products.find((p) => p.id === s.productId);
              return (
                <tr key={s.id}>
                  <td>{fmtDate(s.date)}</td>
                  <td>{prod ? prod.name : s.productName || "Desconocido"}</td>
                  <td>{s.userName || "N/A"}</td>
                  <td>{s.qty}</td>
                  <td>${fmtMoney(s.unitPrice)}</td>
                  <td>{s.paymentMethod}</td>
                  <td>${fmtMoney(saleRevenue(s))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 15, fontWeight: "bold", fontSize: 13 }}>
          Total Facturado: ${fmtMoney(totalRevenue)}
        </div>
      </div>

      {/* Screen view */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>
            Historial de Ventas
            <HelpTag text="Registro de todas las ventas realizadas. Permite filtrar por vendedor, medio de pago, período de tiempo y exportar a Excel." />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
            Consulta y trazabilidad de operaciones comerciales.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => exportSalesToExcel(isOnline ? sales : filteredLocalSales, products)}
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
            <FileSpreadsheet size={14} /> Exportar Excel
          </button>
          <button
            onClick={handlePrint}
            className="sc-btn sc-focus"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--panel-alt)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 6,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* Metrics Header */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "12px 16px",
          flex: 1,
          minWidth: 160,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-faint)" }}>
            <Calendar size={13} />
            <span className="sc-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>OPERACIONES VISIBLES</span>
          </div>
          <div className="sc-mono" style={{ fontSize: 20, fontWeight: 700 }}>
            {currentTotal}
          </div>
        </div>

        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "12px 16px",
          flex: 1,
          minWidth: 160,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-faint)" }}>
            <DollarSign size={13} color="var(--cyan)" />
            <span className="sc-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>TOTAL RECAUDADO</span>
          </div>
          <div className="sc-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>
            ${fmtMoney(totalRevenue)}
          </div>
        </div>

        {isAdmin && (
          <div style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "12px 16px",
            flex: 1,
            minWidth: 160,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-faint)" }}>
              <TrendingUp size={13} color="var(--green)" />
              <span className="sc-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>GANANCIA ESTIMADA</span>
            </div>
            <div className="sc-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>
              ${fmtMoney(totalProfit)}
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}>
        {/* Period Pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { k: "hoy", l: "Hoy" },
            { k: "semana", l: "Esta Semana" },
            { k: "mes", l: "Este Mes" },
            { k: "todo", l: "Todo" },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => { setFilterPeriod(p.k); setPage(1); }}
              className="sc-btn sc-focus"
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                border: filterPeriod === p.k ? "1px solid var(--cyan)" : "1px solid transparent",
                background: filterPeriod === p.k ? "#45D9C71A" : "transparent",
                color: filterPeriod === p.k ? "var(--cyan)" : "var(--text-dim)",
                fontWeight: filterPeriod === p.k ? 600 : 500,
              }}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* User Dropdown Filter - Only for Admins */}
        {isAdmin && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} color="var(--text-faint)" />
            <select
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
              className="sc-focus"
              style={{ ...inputStyle, padding: "6px 10px" }}
            >
              <option value="all">Todos los vendedores</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Payment Dropdown Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CreditCard size={14} color="var(--text-faint)" />
          <select
            value={filterPayment}
            onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }}
            className="sc-focus"
            style={{ ...inputStyle, padding: "6px 10px" }}
          >
            <option value="all">Todos los medios</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta_debito">Tarjeta Débito</option>
            <option value="tarjeta_credito">Tarjeta Crédito</option>
            <option value="transferencia">Transferencia</option>
            <option value="mercado_pago">Mercado Pago</option>
            <option value="uala">Ualá</option>
            <option value="naranja_x">Naranja X</option>
            <option value="personal_pay">Personal Pay</option>
            <option value="modo">MODO</option>
            <option value="lemon_cash">Lemon Cash</option>
            <option value="belo">Belo</option>
            <option value="brubank">Brubank</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative", minWidth: 200 }}>
          <Search size={13} color="var(--text-faint)" style={{ position: "absolute", left: 10, top: 9 }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar venta..."
            className="sc-focus"
            style={{ ...inputStyle, width: "100%", paddingLeft: 30, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Sales Table */}
      {displayedSales.length === 0 ? (
        <EmptyState text="No hay ventas registradas que coincidan con los filtros seleccionados." />
      ) : (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
          <div className="sc-table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                  <th className="sc-mono" style={thStyle}>FECHA / HORA</th>
                  <th className="sc-mono" style={thStyle}>PRODUCTO</th>
                  <th className="sc-mono" style={thStyle}>VENDEDOR</th>
                  <th className="sc-mono" style={thStyle}>MEDIO DE PAGO</th>
                  <th className="sc-mono" style={{ ...thStyle, textAlign: "center" }}>CANTIDAD</th>
                  <th className="sc-mono" style={thStyle}>PRECIO UNIT.</th>
                  {isAdmin && <th className="sc-mono" style={thStyle}>COSTO UNIT.</th>}
                  <th className="sc-mono" style={thStyle}>TOTAL VENTA</th>
                  {isAdmin && <th className="sc-mono" style={thStyle}>GANANCIA</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>
                      Cargando ventas...
                    </td>
                  </tr>
                ) : displayedSales.map((s) => {
                  const prod = products.find((p) => p.id === s.productId);
                  const rev = saleRevenue(s);
                  const cost = saleCost(s);
                  const profit = rev - cost;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--text-faint)" }}>
                        {fmtDate(s.date)}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, minWidth: 150 }}>
                        {prod ? prod.name : s.productName || "Producto eliminado"}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12.5, color: "var(--text-dim)", minWidth: 100 }}>
                        {s.userName || "N/A"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <PaymentBadge method={s.paymentMethod || 'efectivo'} />
                      </td>
                      <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                        {s.qty}
                      </td>
                      <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 12.5 }}>
                        ${fmtMoney(s.unitPrice)}
                      </td>
                      {isAdmin && (
                        <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-faint)" }}>
                          ${fmtMoney(s.costPrice)}
                        </td>
                      )}
                      <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "var(--cyan)" }}>
                        ${fmtMoney(rev)}
                      </td>
                      {isAdmin && (
                        <td className="sc-mono" style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 600, color: profit >= 0 ? "var(--green)" : "var(--red)" }}>
                          ${fmtMoney(profit)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {currentTotal > pageSize && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--panel-alt)', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, currentTotal)} de {currentTotal}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="sc-btn sc-focus"
                  style={{ padding: '6px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, color: page === 1 ? 'var(--text-faint)' : 'var(--text)' }}
                >
                  Anterior
                </button>
                <button
                  disabled={page * pageSize >= currentTotal}
                  onClick={() => setPage(p => p + 1)}
                  className="sc-btn sc-focus"
                  style={{ padding: '6px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, color: page * pageSize >= currentTotal ? 'var(--text-faint)' : 'var(--text)' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 10,
  color: "var(--text-faint)",
  letterSpacing: "0.06em",
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
