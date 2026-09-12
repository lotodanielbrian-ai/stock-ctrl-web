import React from "react";
import { PaymentSelector } from "../PaymentSelector";
import { fmtMoney } from "../../utils/helpers";
import { INVOICE_TYPES } from "../../utils/caja";

export function CheckoutPanel({
  subtotal,
  discount,
  total,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  change,
  invoiceType,
  setInvoiceType,
  customerName,
  setCustomerName,
  customerDocType,
  setCustomerDocType,
  customerDoc,
  setCustomerDoc,
  onCharge,
  onExact,
  processing,
  disabled,
  canCharge,
  chargeHint,
}) {
  const fiscal = INVOICE_TYPES[invoiceType]?.fiscal;

  return (
    <aside className="caja-checkout">
      <div className="caja-totals">
        <div className="caja-total-row">
          <span>Subtotal</span>
          <span className="sc-mono">${fmtMoney(subtotal)}</span>
        </div>
        <div className="caja-total-row">
          <span>Descuentos</span>
          <span className="sc-mono">−${fmtMoney(discount)}</span>
        </div>
        <div className="caja-total-main">
          <span>TOTAL</span>
          <span className="sc-mono">${fmtMoney(total)}</span>
        </div>
      </div>

      <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} compact />

      {paymentMethod === "efectivo" && (
        <div className="caja-cash">
          <label className="caja-field">
            <span>Paga con</span>
            <input
              className="sc-focus sc-mono"
              type="number"
              min={0}
              step="0.01"
              value={cashReceived}
              disabled={disabled}
              onChange={(e) => setCashReceived(e.target.value)}
            />
          </label>
          <button type="button" className="sc-btn caja-btn-ghost" disabled={disabled} onClick={onExact}>
            Exacto
          </button>
          <div className={`caja-vuelto ${change < 0 ? "is-short" : ""}`}>
            <span>Vuelto</span>
            <strong className="sc-mono">${fmtMoney(Math.max(0, change))}</strong>
          </div>
        </div>
      )}

      <label className="caja-field">
        <span>Comprobante</span>
        <select
          className="sc-focus caja-select"
          value={invoiceType}
          disabled={disabled}
          onChange={(e) => setInvoiceType(e.target.value)}
        >
          {Object.values(INVOICE_TYPES).map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </label>

      {fiscal && (
        <div className="caja-customer">
          <input
            className="sc-focus"
            placeholder="Nombre / razón social"
            value={customerName}
            disabled={disabled}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <div className="caja-customer-row">
            <select
              className="sc-focus caja-select"
              value={customerDocType}
              disabled={disabled}
              onChange={(e) => setCustomerDocType(e.target.value)}
            >
              <option value="DNI">DNI</option>
              <option value="CUIT">CUIT</option>
              <option value="CUIL">CUIL</option>
            </select>
            <input
              className="sc-focus sc-mono"
              placeholder="Número"
              value={customerDoc}
              disabled={disabled}
              onChange={(e) => setCustomerDoc(e.target.value)}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="sc-btn sc-focus caja-charge-btn"
        disabled={!canCharge || processing || disabled}
        onClick={onCharge}
      >
        {processing ? "PROCESANDO..." : `COBRAR  $${fmtMoney(total)}`}
      </button>
      {chargeHint ? <p className="caja-hint">{chargeHint}</p> : (
        <p className="caja-hint">F9 cobrar · F4 imprimir último · F8 arqueo</p>
      )}
    </aside>
  );
}
