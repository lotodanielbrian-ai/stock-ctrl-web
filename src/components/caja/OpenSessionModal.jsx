import React, { useState } from "react";
import { registerLabel, locationLabel } from "../../utils/caja";

export function OpenSessionModal({ register, onClose, onConfirm, busy }) {
  const [fondo, setFondo] = useState("0");

  if (!register) return null;

  return (
    <div className="caja-modal-backdrop" onClick={onClose}>
      <div className="caja-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Abrir {registerLabel(register)}</h3>
        <p className="caja-hint">{locationLabel(register.location)} · ingresá el fondo inicial para el arqueo.</p>
        <label className="caja-field">
          <span>Fondo inicial</span>
          <input
            className="sc-focus sc-mono"
            type="number"
            min={0}
            step="0.01"
            autoFocus
            value={fondo}
            onChange={(e) => setFondo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(Number(fondo) || 0);
            }}
          />
        </label>
        <div className="caja-modal-actions">
          <button type="button" className="sc-btn caja-btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="sc-btn caja-btn-primary"
            disabled={busy}
            onClick={() => onConfirm(Number(fondo) || 0)}
          >
            {busy ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      </div>
    </div>
  );
}
