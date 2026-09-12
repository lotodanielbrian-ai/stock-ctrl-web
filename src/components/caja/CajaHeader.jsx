import React from "react";
import { Lock, LockOpen } from "lucide-react";
import { locationLabel, registerLabel } from "../../utils/caja";

export function CajaHeader({
  register,
  registers,
  session,
  cashierName,
  location,
  nowLabel,
  onSelectRegister,
  onOpen,
  onClose,
  onMove,
  disabledSelect,
}) {
  const open = session?.status === "open";

  return (
    <div className="caja-header">
      <div className="caja-header-status">
        <span className={`caja-pill ${open ? "is-open" : "is-closed"}`}>
          {open ? <LockOpen size={13} /> : <Lock size={13} />}
          {open ? "ABIERTA" : "CERRADA"}
        </span>
        <label className="caja-header-field">
          <span>Caja</span>
          <select
            value={register?.id || ""}
            onChange={(e) => onSelectRegister(e.target.value)}
            disabled={disabledSelect}
            className="sc-focus caja-select"
          >
            <option value="">Elegí una caja…</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {registerLabel(r)} · {locationLabel(r.location)}
              </option>
            ))}
          </select>
        </label>
        <div className="caja-header-meta">
          <span>Cajero: <strong>{cashierName}</strong></span>
          <span>{locationLabel(location)}</span>
          <span className="sc-mono">{nowLabel}</span>
        </div>
      </div>
      <div className="caja-header-actions">
        {!open && (
          <button type="button" className="sc-btn sc-focus caja-btn-primary" onClick={onOpen} disabled={!register}>
            Abrir caja
          </button>
        )}
        {open && (
          <>
            <button type="button" className="sc-btn sc-focus caja-btn-ghost" onClick={onMove}>
              Retiro / ingreso
            </button>
            <button type="button" className="sc-btn sc-focus caja-btn-ghost" onClick={onClose}>
              Cerrar / arqueo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
