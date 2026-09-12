import React from "react";
import { Trash2 } from "lucide-react";
import { fmtMoney } from "../../utils/helpers";
import { lineNetUnit, lineTotal, lineDiscountAmount } from "../../utils/caja";

export function TicketGrid({ lines, selectedId, onSelect, onChangeLine, onRemove, disabled }) {
  return (
    <div className="caja-grid-wrap">
      <table className="caja-grid">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th style={{ width: 140 }}>Código</th>
            <th>Descripción</th>
            <th style={{ width: 120 }}>Desc.</th>
            <th style={{ width: 80 }}>Cant.</th>
            <th style={{ width: 110 }}>Precio</th>
            <th style={{ width: 110 }}>Importe</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={8} className="caja-grid-empty">
                Escaneá un código (F1) o buscá un producto para armar el ticket
              </td>
            </tr>
          ) : lines.map((line, idx) => {
            const selected = line.tempId === selectedId;
            return (
              <tr
                key={line.tempId}
                className={selected ? "is-selected" : ""}
                onClick={() => onSelect(line.tempId)}
              >
                <td className="sc-mono">{idx + 1}</td>
                <td className="sc-mono">{line.product.barcode || "—"}</td>
                <td>{line.product.name}</td>
                <td>
                  <div className="caja-discount">
                    <select
                      value={line.discountType}
                      disabled={disabled}
                      onChange={(e) => onChangeLine(line.tempId, { discountType: e.target.value })}
                    >
                      <option value="amount">$</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.discountValue}
                      disabled={disabled}
                      onChange={(e) => onChangeLine(line.tempId, { discountValue: e.target.value })}
                    />
                  </div>
                  {lineDiscountAmount(line) > 0 && (
                    <div className="caja-discount-hint">−${fmtMoney(lineDiscountAmount(line))}</div>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="caja-qty-input"
                    value={line.qty}
                    disabled={disabled}
                    onChange={(e) => onChangeLine(line.tempId, { qty: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </td>
                <td className="sc-mono">${fmtMoney(lineNetUnit(line))}</td>
                <td className="sc-mono caja-importe">${fmtMoney(lineTotal(line))}</td>
                <td>
                  <button
                    type="button"
                    className="caja-icon-btn"
                    disabled={disabled}
                    title="Quitar línea"
                    onClick={(e) => { e.stopPropagation(); onRemove(line.tempId); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
