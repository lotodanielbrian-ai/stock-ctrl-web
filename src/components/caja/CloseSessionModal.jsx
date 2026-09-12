import React, { useMemo, useState } from "react";
import { AR_BILLS, AR_COINS, countArqueo, emptyArqueoCounts, expectedCash, registerLabel } from "../../utils/caja";
import { fmtMoney } from "../../utils/helpers";

export function CloseSessionModal({ register, session, movements, onClose, onConfirm, busy }) {
  const [counts, setCounts] = useState(emptyArqueoCounts);
  const [notes, setNotes] = useState("");

  const expected = useMemo(() => expectedCash(session, movements), [session, movements]);
  const counted = useMemo(() => countArqueo(counts), [counts]);
  const diff = Math.round((counted - expected) * 100) / 100;

  const setQty = (denom, value) => {
    setCounts((prev) => ({ ...prev, [String(denom)]: Math.max(0, Number(value) || 0) }));
  };

  return (
    <div className="caja-modal-backdrop" onClick={onClose}>
      <div className="caja-modal caja-modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>Cerrar / arqueo {register ? registerLabel(register) : ""}</h3>
        <p className="caja-hint">Contá el efectivo de la gaveta. El sistema compara con el esperado de la sesión.</p>

        <div className="caja-arqueo-cols">
          <div>
            <div className="caja-arqueo-title">Billetes</div>
            {AR_BILLS.map((d) => (
              <label key={d} className="caja-arqueo-row">
                <span className="sc-mono">${fmtMoney(d)}</span>
                <input
                  className="sc-focus sc-mono"
                  type="number"
                  min={0}
                  value={counts[String(d)] || 0}
                  onChange={(e) => setQty(d, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div>
            <div className="caja-arqueo-title">Monedas</div>
            {AR_COINS.map((d) => (
              <label key={d} className="caja-arqueo-row">
                <span className="sc-mono">${fmtMoney(d)}</span>
                <input
                  className="sc-focus sc-mono"
                  type="number"
                  min={0}
                  value={counts[String(d)] || 0}
                  onChange={(e) => setQty(d, e.target.value)}
                />
              </label>
            ))}
            <label className="caja-field" style={{ marginTop: 12 }}>
              <span>Notas</span>
              <input className="sc-focus" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </label>
          </div>
        </div>

        <div className="caja-arqueo-summary">
          <div><span>Esperado</span><strong className="sc-mono">${fmtMoney(expected)}</strong></div>
          <div><span>Contado</span><strong className="sc-mono">${fmtMoney(counted)}</strong></div>
          <div className={diff === 0 ? "is-ok" : "is-diff"}>
            <span>{diff === 0 ? "Cuadró" : diff > 0 ? "Sobrante" : "Faltante"}</span>
            <strong className="sc-mono">${fmtMoney(Math.abs(diff))}</strong>
          </div>
        </div>

        <div className="caja-modal-actions">
          <button type="button" className="sc-btn caja-btn-ghost" onClick={onClose}>Seguir vendiendo</button>
          <button
            type="button"
            className="sc-btn caja-btn-primary"
            disabled={busy}
            onClick={() => onConfirm({ countedCash: counted, notes })}
          >
            {busy ? "Cerrando…" : "Cerrar caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
