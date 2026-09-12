import React from "react";
import { fmtMoney } from "../../utils/helpers";
import { INVOICE_TYPES, registerLabel, locationLabel } from "../../utils/caja";

export function TicketReceipt({ ticket, register, fiscal, cashierName }) {
  if (!ticket) return null;
  const typeInfo = INVOICE_TYPES[ticket.invoiceType] || INVOICE_TYPES.ticket;
  const when = new Date(ticket.createdAt || Date.now()).toLocaleString("es-AR");

  return (
    <div id="sc-ticket-print" className="sc-ticket-print">
      <div className="sc-ticket-inner">
        <h1>{fiscal?.razonSocial || "STOCK//CTRL"}</h1>
        {fiscal?.cuit ? <p>CUIT {fiscal.cuit}</p> : null}
        {fiscal?.domicilio ? <p>{fiscal.domicilio}</p> : null}
        {fiscal?.condicionIva ? <p>{String(fiscal.condicionIva).replace("_", " ")}</p> : null}
        <p className="sc-ticket-strong">{typeInfo.label.toUpperCase()}</p>
        <p>{ticket.ticketNumber}</p>
        {register ? <p>{registerLabel(register)} · {locationLabel(register.location)}</p> : null}
        <p>{when}</p>
        <p>Cajero: {cashierName || ticket.userName}</p>
        <hr />
        {(ticket.lines || []).map((l, i) => (
          <div key={i} className="sc-ticket-line">
            <div>{l.productName}</div>
            <div className="sc-ticket-row">
              <span>{l.qty} × ${fmtMoney(l.unitPrice ?? l.listPrice)}</span>
              <span>${fmtMoney(l.lineTotal)}</span>
            </div>
            {l.discount ? <div className="sc-ticket-dto">dto ${fmtMoney(l.discount)}</div> : null}
          </div>
        ))}
        <hr />
        {ticket.discountTotal > 0 ? (
          <div className="sc-ticket-row"><span>Descuentos</span><span>-${fmtMoney(ticket.discountTotal)}</span></div>
        ) : null}
        <div className="sc-ticket-row sc-ticket-strong">
          <span>TOTAL</span>
          <span>${fmtMoney(ticket.total)}</span>
        </div>
        <p>Pago: {ticket.paymentLabel || ticket.paymentMethod}</p>
        {ticket.paymentMethod === "efectivo" ? (
          <>
            <div className="sc-ticket-row"><span>Paga con</span><span>${fmtMoney(ticket.cashReceived)}</span></div>
            <div className="sc-ticket-row"><span>Vuelto</span><span>${fmtMoney(ticket.changeGiven)}</span></div>
          </>
        ) : null}
        {ticket.customerName || ticket.customerDoc ? (
          <p>Cliente: {ticket.customerName} {ticket.customerDocType} {ticket.customerDoc}</p>
        ) : null}
        {ticket.cae ? (
          <>
            <p>CAE {ticket.cae}</p>
            {ticket.caeVto ? <p>Vto CAE {ticket.caeVto}</p> : null}
            {ticket.invoiceNumber ? <p>N° {ticket.invoiceNumber}</p> : null}
          </>
        ) : typeInfo.fiscal ? (
          <>
            <p className="sc-ticket-strong">COMPROBANTE NO FISCAL</p>
            <p>Factura electrónica no emitida. Configurá AFIP para obtener CAE.</p>
          </>
        ) : (
          <p>Ticket interno — no válido como factura</p>
        )}
        <p>Gracias por su compra</p>
      </div>
    </div>
  );
}
