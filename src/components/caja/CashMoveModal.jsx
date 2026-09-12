import React, { useState } from "react";

export function CashMoveModal({ onClose, onConfirm, busy }) {
  const [type, setType] = useState("withdrawal");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="caja-modal-backdrop" onClick={onClose}>
      <div className="caja-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Movimiento de caja</h3>
        <label className="caja-field">
          <span>Tipo</span>
          <select className="sc-focus caja-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="withdrawal">Retiro</option>
            <option value="deposit">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
        </label>
        <label className="caja-field">
          <span>Importe</span>
          <input className="sc-focus sc-mono" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </label>
        <label className="caja-field">
          <span>Nota</span>
          <input className="sc-focus" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </label>
        <div className="caja-modal-actions">
          <button type="button" className="sc-btn caja-btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="sc-btn caja-btn-primary"
            disabled={busy || !Number(amount)}
            onClick={() => onConfirm({ type, amount: Number(amount) || 0, note })}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
