import React, { useState } from "react";
import { Wallet, DollarSign, Users, Award, Percent } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { fmtMoney, saleRevenue } from "../utils/helpers";
import { useData } from "../contexts/DataContext";

export function NominaView() {
  const { users, sales } = useData();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const sellers = users.filter((u) => u.role === "vendedor");

  // Calculate monthly stats per seller
  const sellerStats = sellers.map((seller) => {
    const sellerSales = sales.filter((s) => {
      if (s.userId !== seller.id) return false;
      const d = new Date(s.date);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return mStr === selectedMonth;
    });

    const totalGenerated = sellerSales.reduce((acc, s) => acc + saleRevenue(s), 0);
    const commissionRate = Number(seller.commissionRate) || 0;
    const commissionEarned = (totalGenerated * commissionRate) / 100;
    const baseSalary = Number(seller.salary) || 0;
    const totalPayout = baseSalary + commissionEarned;

    return {
      seller,
      salesCount: sellerSales.length,
      totalGenerated,
      commissionRate,
      commissionEarned,
      baseSalary,
      totalPayout,
    };
  });

  const totalPayrollCost = sellerStats.reduce((acc, st) => acc + st.totalPayout, 0);

  return (
    <div className="sc-fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>
            Nómina y Comisiones de Vendedores
            <HelpTag text="Cálculo de sueldo total mensual por vendedor, sumando sueldo básico más la comisión acordada por ventas realizadas en el período." />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
            Liquidación de salarios y seguimiento de incentivos por ventas.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>Mes de liquidación:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="sc-focus sc-mono"
            style={{
              background: "var(--panel-alt)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "7px 10px",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: "14px 16px",
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-faint)" }}>
            <Users size={14} color="var(--cyan)" />
            <span className="sc-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>VENDEDORES ACTIVOS</span>
          </div>
          <div className="sc-mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {sellers.length}
          </div>
        </div>

        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: "14px 16px",
          flex: 1,
          minWidth: 180,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--text-faint)" }}>
            <Wallet size={14} color="var(--green)" />
            <span className="sc-mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>TOTAL NÓMINA MES</span>
          </div>
          <div className="sc-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--green)" }}>
            ${fmtMoney(totalPayrollCost)}
          </div>
        </div>
      </div>

      {/* Seller Payroll Table */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                <th className="sc-mono" style={thStyle}>VENDEDOR</th>
                <th className="sc-mono" style={thStyle}>VENTAS MES</th>
                <th className="sc-mono" style={thStyle}>FACTURADO ($)</th>
                <th className="sc-mono" style={thStyle}>SUELDO BÁSICO ($)</th>
                <th className="sc-mono" style={thStyle}>COMISIÓN (%)</th>
                <th className="sc-mono" style={thStyle}>COMISIÓN GANADA ($)</th>
                <th className="sc-mono" style={{ ...thStyle, textAlign: "right" }}>TOTAL A COBRAR</th>
              </tr>
            </thead>
            <tbody>
              {sellerStats.map((st) => (
                <tr key={st.seller.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>
                    <div>{st.seller.name}</div>
                    <div className="sc-mono" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>@{st.seller.username}</div>
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>
                    {st.salesCount} oper.
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 13, color: "var(--cyan)", fontWeight: 600 }}>
                    ${fmtMoney(st.totalGenerated)}
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 13 }}>
                    ${fmtMoney(st.baseSalary)}
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--amber)" }}>
                    {st.commissionRate}%
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 13, color: "var(--amber)", fontWeight: 600 }}>
                    ${fmtMoney(st.commissionEarned)}
                  </td>
                  <td className="sc-mono" style={{ padding: "12px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--green)" }}>
                    ${fmtMoney(st.totalPayout)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "11px 14px",
  fontSize: 10,
  color: "var(--text-faint)",
  letterSpacing: "0.06em",
  fontWeight: 600,
};
