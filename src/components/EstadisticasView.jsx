import React, { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3, Trophy, DollarSign, Wallet, ShoppingCart, CreditCard } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { KpiCard } from "./KpiCard";
import { EmptyState } from "./GaugeBar";
import { fmtMoney, saleRevenue, saleCost, periodRange } from "../utils/helpers";
import { useData } from "../contexts/DataContext";
import * as saleService from "../services/saleService";
import { PAYMENT_METHODS } from "../utils/paymentMethods";

export function EstadisticasView() {
  const { sales: localSales, products, isOnline } = useData();
  const [period, setPeriod] = useState("mes"); // "dia" | "semana" | "mes" | "anio"
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const range = useMemo(() => periodRange(period), [period]);

  useEffect(() => {
    if (isOnline) {
      let mounted = true;
      setLoading(true);
      saleService.getStats(range.start, range.end)
        .then(data => {
          if (mounted) setStats(data);
        })
        .catch(e => console.error(e))
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => { mounted = false; };
    }
  }, [isOnline, range]);

  const localData = useMemo(() => {
    if (isOnline) return null;

    const periodSales = localSales.filter((s) => {
      const d = new Date(s.date);
      return d >= range.start && d <= range.end;
    });

    const totalRev = periodSales.reduce((a, s) => a + saleRevenue(s), 0);
    const totalCost = periodSales.reduce((a, s) => a + saleCost(s), 0);
    const totalProfit = totalRev - totalCost;
    const avgTicket = periodSales.length > 0 ? totalRev / periodSales.length : 0;
    const totalUnits = periodSales.reduce((a, s) => a + Number(s.qty || 0), 0);

    // Payment methods map
    const pmMap = {};
    periodSales.forEach(s => {
      const pm = s.paymentMethod || 'efectivo';
      if (!pmMap[pm]) pmMap[pm] = { method: pm, count: 0, revenue: 0 };
      pmMap[pm].count++;
      pmMap[pm].revenue += saleRevenue(s);
    });

    const timelineMap = {};
    periodSales.forEach((s) => {
      const d = new Date(s.date);
      let key = d.toLocaleDateString("es-AR", { month: "short", day: "numeric" });
      if (period === "dia") {
        key = d.toLocaleTimeString("es-AR", { hour: "2-digit" }) + "h";
      }
      if (!timelineMap[key]) timelineMap[key] = { name: key, Ventas: 0, Ganancia: 0, Unidades: 0 };
      const rev = saleRevenue(s);
      timelineMap[key].Ventas += rev;
      timelineMap[key].Ganancia += (rev - saleCost(s));
      timelineMap[key].Unidades += Number(s.qty || 0);
    });

    const topMap = {};
    periodSales.forEach((s) => {
      const prod = products.find((p) => p.id === s.productId);
      const name = prod ? prod.name : s.productName || "Desconocido";
      if (!topMap[name]) topMap[name] = { name: name.length > 18 ? name.slice(0, 18) + "..." : name, Recaudacion: 0, Unidades: 0 };
      topMap[name].Recaudacion += saleRevenue(s);
      topMap[name].Unidades += Number(s.qty || 0);
    });

    return {
      total_revenue: totalRev,
      total_cost: totalCost,
      total_profit: totalProfit,
      total_sales: periodSales.length,
      total_units: totalUnits,
      avg_ticket: avgTicket,
      by_payment_method: Object.values(pmMap).sort((a, b) => b.revenue - a.revenue),
      timelineData: Object.values(timelineMap),
      topProductsData: Object.values(topMap).sort((a, b) => b.Recaudacion - a.Recaudacion).slice(0, 5)
    };
  }, [isOnline, localSales, range, period, products]);

  const displayData = isOnline ? stats : localData;

  if (loading || (!displayData && isOnline)) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando estadísticas...</div>;
  }

  if (!displayData || displayData.total_sales === 0) {
    return (
      <div className="sc-fadein">
        <EmptyState icon={BarChart3} text="No hay registros de ventas para el período seleccionado. Cambiá el filtro o registrá ventas." />
      </div>
    );
  }

  const marginPct = displayData.total_revenue > 0 
    ? ((displayData.total_profit / displayData.total_revenue) * 100).toFixed(1) 
    : 0;

  // Format payment methods for PieChart
  const paymentData = (displayData.by_payment_method || []).map(pm => {
    const info = PAYMENT_METHODS[pm.method] || { label: pm.method, color: '#888' };
    return {
      name: info.label,
      value: Number(pm.revenue),
      color: info.color
    };
  });

  return (
    <div className="sc-fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>
            Estadísticas y Métricas del Negocio
            <HelpTag text="Visualizá el rendimiento comercial, medios de pago más usados, márgenes de ganancia y productos más vendidos." />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
            Inteligencia de negocios e indicadores clave de rentabilidad.
          </p>
        </div>

        {/* Period selection pills */}
        <div style={{ display: "flex", gap: 4, background: "var(--panel)", border: "1px solid var(--border)", padding: 3, borderRadius: 8 }}>
          {[
            { k: "dia", l: "Hoy" },
            { k: "semana", l: "Semana" },
            { k: "mes", l: "Mes" },
            { k: "anio", l: "Año" },
          ].map((p) => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k)}
              className="sc-btn sc-focus"
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                border: "none",
                background: period === p.k ? "var(--panel-alt)" : "transparent",
                color: period === p.k ? "var(--cyan)" : "var(--text-dim)",
                fontWeight: period === p.k ? 600 : 500,
              }}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard icon={DollarSign} label="FACTURACIÓN PERÍODO" value={`$${fmtMoney(displayData.total_revenue)}`} accent="var(--cyan)" />
        <KpiCard icon={TrendingUp} label="GANANCIA BRUTA" value={`$${fmtMoney(displayData.total_profit)}`} accent="var(--green)" sub={`Margen: ${marginPct}%`} />
        <KpiCard icon={ShoppingCart} label="TICKET PROMEDIO" value={`$${fmtMoney(displayData.avg_ticket)}`} />
        <KpiCard icon={Wallet} label="UNIDADES VENDIDAS" value={displayData.total_units.toLocaleString("es-AR")} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* Timeline Chart - Only available if offline for now, or if online returns timelineData. 
            Currently getStats() RPC only returns aggregates, not timeline. So we hide it if online unless updated. */}
        {displayData.timelineData && (
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div className="sc-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} color="var(--cyan)" /> Evolución de Ventas y Ganancias ($)
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData.timelineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                  <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: "var(--panel-alt)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text)" }} formatter={(val) => [`$${fmtMoney(val)}`]} />
                  <Legend />
                  <Line type="monotone" dataKey="Ventas" stroke="var(--cyan)" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Ganancia" stroke="var(--green)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 20 }} className="sc-mobile-flex-col">
          {/* Top Products */}
          {displayData.topProductsData && (
            <div style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
              <div className="sc-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={16} color="var(--amber)" /> Top 5 Productos ($)
              </div>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayData.topProductsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ background: "var(--panel-alt)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text)" }} />
                    <Bar dataKey="Recaudacion" fill="var(--cyan)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 20 }}>
            <div className="sc-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={16} color="#7B61FF" /> Recaudación por Medio de Pago
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: "var(--panel-alt)", borderColor: "var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13 }}
                    formatter={(val) => [`$${fmtMoney(val)}`]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
