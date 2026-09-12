import React, { useEffect, useMemo, useRef, useState } from "react";
import { CameraScanner } from "./CameraScanner";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useToast } from "./Toast";
import { uid } from "../utils/helpers";
import { getPaymentInfo } from "../utils/paymentMethods";
import { INVOICE_TYPES, stockFieldForLocation, ticketTotals } from "../utils/caja";
import { printBrowserTicket, printThermal, getPrinterPrefs, isSerialConnected } from "../services/printerService";
import { requestAfipInvoice } from "../services/fiscalService";
import { CajaHeader } from "./caja/CajaHeader";
import { BarcodeBar } from "./caja/BarcodeBar";
import { TicketGrid } from "./caja/TicketGrid";
import { CheckoutPanel } from "./caja/CheckoutPanel";
import { OpenSessionModal } from "./caja/OpenSessionModal";
import { CloseSessionModal } from "./caja/CloseSessionModal";
import { CashMoveModal } from "./caja/CashMoveModal";
import { TicketReceipt } from "./caja/TicketReceipt";

const REGISTER_KEY = "sc-active-register";

export function VentaView() {
  const { products, cashRegisters, cashSessions, cashMovements, fiscalSettings, handleRegisterTicket, handleOpenSession, handleCloseSession, handleAddMovement } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const location = currentUser.assignedLocation || "local1";
  const visibleRegisters = useMemo(() => {
    const active = (cashRegisters || []).filter((r) => r.isActive);
    if (isAdmin) return active;
    return active.filter((r) => r.location === location);
  }, [cashRegisters, isAdmin, location]);

  const [registerId, setRegisterId] = useState(() => localStorage.getItem(REGISTER_KEY) || "");
  const register = visibleRegisters.find((r) => r.id === registerId) || visibleRegisters[0] || null;
  const session = cashSessions.find((s) => s.registerId === register?.id && s.status === "open") || null;
  const sessionOpen = session?.status === "open";

  const [nowLabel, setNowLabel] = useState(() => new Date().toLocaleString("es-AR"));
  useEffect(() => {
    const t = setInterval(() => setNowLabel(new Date().toLocaleString("es-AR")), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (register?.id) localStorage.setItem(REGISTER_KEY, register.id);
  }, [register?.id]);

  const [lines, setLines] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scanValue, setScanValue] = useState("");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cashReceived, setCashReceived] = useState("");
  const [invoiceType, setInvoiceType] = useState("ticket");
  const [customerName, setCustomerName] = useState("");
  const [customerDocType, setCustomerDocType] = useState("DNI");
  const [customerDoc, setCustomerDoc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [lastTicket, setLastTicket] = useState(null);

  const barcodeRef = useRef(null);
  const qtyRef = useRef(null);
  const searchRef = useRef(null);
  const confirmRef = useRef(null);
  const lastTicketRef = useRef(null);

  const totals = useMemo(() => ticketTotals(lines), [lines]);
  const cashNum = cashReceived === "" ? null : Number(cashReceived);
  const change = (cashNum == null ? 0 : cashNum) - totals.total;
  const cashOk = paymentMethod !== "efectivo" || cashNum == null || cashNum >= totals.total;
  const canCharge = sessionOpen && lines.length > 0 && !processing && cashOk;

  const chargeHint = !sessionOpen
    ? "Abrí la caja para cobrar"
    : paymentMethod === "efectivo" && cashNum != null && cashNum < totals.total
      ? "El efectivo no cubre el total"
      : "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [products, search]);

  const focusBarcode = () => setTimeout(() => barcodeRef.current?.focus(), 40);

  const addProduct = (product, addQty) => {
    if (!sessionOpen) {
      addToast("Abrí la caja antes de cargar productos.", "error");
      return;
    }
    const q = Math.max(1, Number(addQty) || 1);
    const field = stockFieldForLocation(location);
    const available = Number(product[field]) || 0;
    const already = lines.filter((l) => l.productId === product.id).reduce((a, l) => a + Number(l.qty), 0);
    if (available < already + q && !isAdmin) {
      addToast(`Stock insuficiente de ${product.name}. Disponible: ${available}`, "error");
      return;
    }

    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => l.tempId === existing.tempId ? { ...l, qty: Number(l.qty) + q } : l);
      }
      return [...prev, {
        tempId: uid(),
        productId: product.id,
        product,
        qty: q,
        listPrice: Number(product.publicPrice) || 0,
        discountType: "amount",
        discountValue: 0,
      }];
    });
    setQty(1);
    setScanValue("");
    setSearch("");
    setShowSearch(false);
    focusBarcode();
  };

  const handleScanSubmit = () => {
    const code = scanValue.trim();
    if (!code) return;
    const product = products.find((p) => p.barcode && p.barcode.trim() === code);
    if (!product) {
      addToast(`Código no reconocido: ${code}`, "error");
      setScanValue("");
      return;
    }
    addProduct(product, qty);
  };

  const handleCameraScan = (code) => {
    setShowCamera(false);
    if (!code) return;
    const product = products.find((p) => p.barcode && p.barcode.trim() === code);
    if (!product) {
      addToast(`Código no reconocido: ${code}`, "error");
      return;
    }
    addProduct(product, qty);
  };

  const printTicket = async (ticket) => {
    if (!ticket) return;
    const prefs = getPrinterPrefs();
    if (prefs.mode === "serial" && isSerialConnected()) {
      try {
        await printThermal(ticket, {
          register,
          fiscal: fiscalSettings,
          openDrawer: ticket.paymentMethod === "efectivo",
        });
        addToast("Ticket enviado a la térmica", "success");
        return;
      } catch (e) {
        addToast(`Térmica: ${e.message}. Imprimiendo en el navegador.`, "error");
      }
    }
    printBrowserTicket();
  };

  const confirmPayment = async () => {
    if (!canCharge) {
      if (chargeHint) addToast(chargeHint, "error");
      return;
    }
    setProcessing(true);
    try {
      let fiscal = { fiscalStatus: "none", cae: "", caeVto: "", invoiceNumber: "" };
      const typeInfo = INVOICE_TYPES[invoiceType];
      if (typeInfo?.fiscal) {
        const afip = await requestAfipInvoice({
          invoiceType,
          total: totals.total,
          customerName,
          customerDocType,
          customerDoc,
          puntoVenta: register?.afipPuntoVenta,
          fiscalSettings,
        });
        if (afip.ok && afip.cae) {
          fiscal = { fiscalStatus: "issued", cae: afip.cae, caeVto: afip.caeVto || "", invoiceNumber: afip.invoiceNumber || "" };
        } else {
          fiscal = { fiscalStatus: "error" };
          addToast(afip.message || "AFIP no emitió CAE. Se guarda como no fiscal.", "error");
        }
      }

      const received = paymentMethod === "efectivo"
        ? (cashNum == null ? totals.total : cashNum)
        : 0;
      const given = paymentMethod === "efectivo" ? Math.max(0, received - totals.total) : 0;

      const ticket = await handleRegisterTicket({
        lines,
        paymentMethod,
        paymentDetail: "",
        registerId: register.id,
        sessionId: session.id,
        cashReceived: received,
        changeGiven: given,
        invoiceType,
        customerName,
        customerDocType,
        customerDoc,
        fiscal,
        user: currentUser,
        location,
      });

      const decorated = {
        ...ticket,
        paymentLabel: getPaymentInfo(paymentMethod).label,
        cashReceived: received,
        changeGiven: given,
      };
      setLastTicket(decorated);
      setLines([]);
      setSelectedId(null);
      setCashReceived("");
      setInvoiceType("ticket");
      setCustomerName("");
      setCustomerDoc("");
      addToast(`Cobro confirmado: $${totals.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`, "success");
      setTimeout(() => printTicket(decorated), 80);
      focusBarcode();
    } catch (e) {
      addToast(e.message || "No se pudo cobrar", "error");
    } finally {
      setProcessing(false);
    }
  };

  confirmRef.current = confirmPayment;
  lastTicketRef.current = lastTicket;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") { e.preventDefault(); barcodeRef.current?.focus(); }
      if (e.key === "F2") { e.preventDefault(); qtyRef.current?.focus(); qtyRef.current?.select(); }
      if (e.key === "F3") { e.preventDefault(); searchRef.current?.focus(); setShowSearch(true); }
      if (e.key === "F4") { e.preventDefault(); if (lastTicketRef.current) printTicket(lastTicketRef.current); }
      if (e.key === "F8") { e.preventDefault(); if (sessionOpen) setShowClose(true); }
      if (e.key === "F9") { e.preventDefault(); confirmRef.current?.(); }
      if (e.key === "Delete" && selectedId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setLines((prev) => prev.filter((l) => l.tempId !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "Escape") {
        setScanValue("");
        setSearch("");
        setShowSearch(false);
        setShowCamera(false);
        focusBarcode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionOpen, selectedId, register, fiscalSettings]);

  useEffect(() => {
    if (sessionOpen) focusBarcode();
  }, [sessionOpen]);

  return (
    <div className="caja-pos sc-fadein">
      <TicketReceipt ticket={lastTicket} register={register} fiscal={fiscalSettings} cashierName={currentUser.name} />

      <CajaHeader
        register={register}
        registers={visibleRegisters}
        session={session}
        cashierName={currentUser.name}
        location={location}
        nowLabel={nowLabel}
        onSelectRegister={(id) => setRegisterId(id)}
        onOpen={() => setShowOpen(true)}
        onClose={() => setShowClose(true)}
        onMove={() => setShowMove(true)}
        disabledSelect={lines.length > 0}
      />

      <BarcodeBar
        barcodeRef={barcodeRef}
        qtyRef={qtyRef}
        searchRef={searchRef}
        scanValue={scanValue}
        setScanValue={setScanValue}
        onScanSubmit={handleScanSubmit}
        qty={qty}
        setQty={setQty}
        search={search}
        setSearch={(v) => { setSearch(v); setShowSearch(true); }}
        onSearchFocus={() => setShowSearch(true)}
        onOpenCamera={() => setShowCamera(true)}
        disabled={!sessionOpen || processing}
      />

      {showSearch && search && (
        <div className="caja-search-results">
          {filtered.length === 0 && <div className="caja-hint">Sin resultados</div>}
          {filtered.map((p) => {
            const available = Number(p[stockFieldForLocation(location)]) || 0;
            return (
              <button
                key={p.id}
                type="button"
                className="caja-search-item"
                disabled={available <= 0 && !isAdmin}
                onClick={() => addProduct(p, qty)}
              >
                <span>{p.name}</span>
                <span className="sc-mono">{p.barcode || "s/c"} · stock {available}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="caja-body">
        <TicketGrid
          lines={lines}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChangeLine={(id, patch) => setLines((prev) => prev.map((l) => l.tempId === id ? { ...l, ...patch } : l))}
          onRemove={(id) => setLines((prev) => prev.filter((l) => l.tempId !== id))}
          disabled={!sessionOpen || processing}
        />
        <CheckoutPanel
          subtotal={totals.subtotal}
          discount={totals.discount}
          total={totals.total}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          change={change}
          invoiceType={invoiceType}
          setInvoiceType={setInvoiceType}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerDocType={customerDocType}
          setCustomerDocType={setCustomerDocType}
          customerDoc={customerDoc}
          setCustomerDoc={setCustomerDoc}
          onCharge={confirmPayment}
          onExact={() => setCashReceived(String(totals.total))}
          processing={processing}
          disabled={!sessionOpen}
          canCharge={canCharge}
          chargeHint={chargeHint}
        />
      </div>

      {showOpen && (
        <OpenSessionModal
          register={register}
          busy={processing}
          onClose={() => setShowOpen(false)}
          onConfirm={async (fondo) => {
            setProcessing(true);
            try {
              await handleOpenSession({ registerId: register.id, openingFloat: fondo, user: currentUser });
              addToast("Caja abierta", "success");
              setShowOpen(false);
              focusBarcode();
            } catch (e) {
              addToast(e.message, "error");
            } finally {
              setProcessing(false);
            }
          }}
        />
      )}

      {showClose && session && (
        <CloseSessionModal
          register={register}
          session={session}
          movements={cashMovements}
          busy={processing}
          onClose={() => setShowClose(false)}
          onConfirm={async ({ countedCash, notes }) => {
            if (lines.length) {
              addToast("Cobrà o vaciá el ticket antes de cerrar la caja.", "error");
              return;
            }
            setProcessing(true);
            try {
              const result = await handleCloseSession({ sessionId: session.id, countedCash, notes });
              const diff = result?.difference ?? 0;
              addToast(diff === 0 ? "Caja cerrada. Cuadró." : `Caja cerrada. Diferencia: ${diff}`, "success");
              setShowClose(false);
            } catch (e) {
              addToast(e.message, "error");
            } finally {
              setProcessing(false);
            }
          }}
        />
      )}

      {showMove && session && (
        <CashMoveModal
          busy={processing}
          onClose={() => setShowMove(false)}
          onConfirm={async ({ type, amount, note }) => {
            setProcessing(true);
            try {
              await handleAddMovement({ sessionId: session.id, type, amount, note });
              addToast("Movimiento registrado", "success");
              setShowMove(false);
            } catch (e) {
              addToast(e.message, "error");
            } finally {
              setProcessing(false);
            }
          }}
        />
      )}

      {showCamera && (
        <CameraScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
