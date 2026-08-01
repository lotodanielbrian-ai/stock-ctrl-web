import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, X, Ban, CheckCircle2, Camera, Trash2 } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { ProductThumb, LevelBadge, EmptyState } from "./GaugeBar";
import { stockLevel, fmtMoney, saleRevenue, uid } from "../utils/helpers";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./Toast";
import { PaymentSelector } from "./PaymentSelector";
import { CameraScanner } from "./CameraScanner";

function ScanBarcodeIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto" }}>
      <rect x="2" y="4" width="2" height="16" fill="var(--cyan)" />
      <rect x="6" y="4" width="1" height="16" fill="var(--text-dim)" />
      <rect x="9" y="4" width="2" height="16" fill="var(--cyan)" />
      <rect x="13" y="4" width="1" height="16" fill="var(--text-dim)" />
      <rect x="15" y="4" width="2" height="16" fill="var(--cyan)" />
      <rect x="19" y="4" width="1" height="16" fill="var(--text-dim)" />
      <rect x="21" y="4" width="2" height="16" fill="var(--cyan)" />
    </svg>
  );
}

export function VentaView() {
  const { products, sales, handleSell, handleUndoSale, handleUpdatePaymentMethod } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState("escaner"); // "escaner" | "manual"
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [isSelling, setIsSelling] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // NEW: Supermarket-style purchase list
  const [purchaseList, setPurchaseList] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const selected = products.find((p) => p.id === productId);

  // Helper to add to purchase list and deduct stock immediately
  const addToPurchaseList = async (product, addQty) => {
    setIsSelling(true);
    try {
      // By default register with 'efectivo', we'll update it later when they confirm the total
      const result = await handleSell(product.id, addQty, currentUser, currentUser.assignedLocation, "efectivo", "");
      
      const saleId = result?.sale_id || result?.id; // depending on online/offline response
      
      setPurchaseList(prev => [...prev, {
        tempId: uid(),
        product,
        qty: addQty,
        price: product.publicPrice,
        saleId
      }]);
      
      addToast(`Agregado: ${addQty} × ${product.name} — $${fmtMoney(product.publicPrice * addQty)}`, "success");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSelling(false);
    }
  };

  const submitManual = async () => {
    if (!selected) {
      addToast("Elegí un producto de la lista.", "error");
      return;
    }
    const q = Number(qty);
    if (!q || q <= 0) {
      addToast("Ingresá una cantidad válida mayor a 0.", "error");
      return;
    }
    
    await addToPurchaseList(selected, q);
    setQty(1);
    setProductId("");
    setSearch("");
  };

  /* Scanner Mode */
  const scanRef = useRef(null);
  const [scanValue, setScanValue] = useState("");

  useEffect(() => {
    if (mode === "escaner" && scanRef.current) {
      scanRef.current.focus();
    }
  }, [mode]);

  const handleScanKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (isSelling) return;

    const code = scanValue.trim();
    setScanValue("");
    if (!code) return;

    const product = products.find((p) => p.barcode && p.barcode.trim() === code);
    if (!product) {
      addToast(`Código no reconocido: ${code}`, "error");
      return;
    }
    
    await addToPurchaseList(product, 1);
  };

  const handleCameraScan = async (code) => {
    setShowCamera(false);
    if (!code) return;
    
    const product = products.find((p) => p.barcode && p.barcode.trim() === code);
    if (!product) {
      addToast(`Código no reconocido: ${code}`, "error");
      return;
    }
    
    await addToPurchaseList(product, 1);
  };

  const removeFromList = async (tempId) => {
    const item = purchaseList.find(i => i.tempId === tempId);
    if (!item) return;

    setIsProcessing(true);
    try {
      await handleUndoSale(item.saleId, item.product.id, item.qty, currentUser.assignedLocation);
      setPurchaseList(prev => prev.filter(i => i.tempId !== tempId));
      addToast(`Devuelto: ${item.product.name} — stock restaurado`, "success");
    } catch (e) {
      addToast(`Error al devolver: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (purchaseList.length === 0) return;
    
    setIsProcessing(true);
    try {
      const saleIds = purchaseList.map(i => i.saleId);
      await handleUpdatePaymentMethod(saleIds, paymentMethod);
      addToast(`Cobro confirmado: $${fmtMoney(purchaseTotal)}`, "success");
      setPurchaseList([]);
      setPaymentMethod("efectivo");
    } catch (e) {
      addToast(`Error al confirmar pago: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "var(--panel-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 11px",
    color: "var(--text)",
    fontSize: 13.5,
  };

  const purchaseTotal = purchaseList.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="sc-fadein" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      
      {/* PANEL IZQUIERDO: Escáner y búsqueda */}
      <div style={{ flex: "1 1 400px", maxWidth: 600 }}>
        <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
          Caja — Registrar productos
          <HelpTag text="Al escanear, el stock se descuenta y se agrega a la lista. Podés deshacer cualquier ítem desde la lista." />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 16 }}>
          Cajero: <strong style={{ color: "var(--cyan)" }}>{currentUser.name}</strong> en <strong style={{ color: "var(--green)" }}>{currentUser.assignedLocation === 'local2' ? 'Local 2' : (currentUser.assignedLocation === 'deposito' ? 'Depósito' : 'Local 1')}</strong>
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { k: "escaner", l: "Escáner" },
            { k: "manual", l: "Búsqueda manual" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => { setMode(t.k); }}
              className="sc-btn sc-focus"
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                fontSize: 12.5,
                cursor: "pointer",
                border: `1px solid ${mode === t.k ? "var(--cyan)" : "var(--border)"}`,
                background: mode === t.k ? "#45D9C71A" : "transparent",
                color: mode === t.k ? "var(--cyan)" : "var(--text-dim)",
                fontWeight: 600,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {products.length === 0 ? (
          <EmptyState text="No hay productos cargados todavía." />
        ) : (
          <>
            {mode === "escaner" ? (
              <div
                onClick={() => scanRef.current && scanRef.current.focus()}
                style={{
                  background: "var(--panel)",
                  border: "2px solid var(--border)",
                  borderRadius: 10,
                  padding: 24,
                  textAlign: "center",
                  cursor: "text",
                  transition: "border-color .15s ease",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                  marginBottom: 16,
                  opacity: isSelling || isProcessing ? 0.6 : 1,
                  position: "relative",
                }}
              >
                <ScanBarcodeIcon />
                <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "12px 0 14px" }}>
                  Apuntá con el lector al código del producto
                </div>
                <input
                  ref={scanRef}
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={handleScanKeyDown}
                  onBlur={() => setTimeout(() => scanRef.current && scanRef.current.focus(), 80)}
                  className="sc-focus sc-mono"
                  style={{ ...inputStyle, textAlign: "center", fontSize: 17, letterSpacing: "0.08em", maxWidth: 380, margin: "0 auto" }}
                  placeholder="Esperando escaneo..."
                  autoFocus
                  disabled={isSelling || isProcessing}
                />

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px dashed var(--border-soft)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>¿No tienes lector óptico?</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}
                    className="sc-btn sc-focus"
                    style={{
                      background: "var(--cyan)",
                      color: "#000",
                      padding: "10px 20px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Camera size={18} />
                    Escanear con Celular
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: 20,
                boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
              }}>
                <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  BUSCAR PRODUCTO
                </label>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <Search size={14} color="var(--text-faint)" style={{ position: "absolute", left: 10, top: 11 }} />
                  <input
                    value={selected ? selected.name : search}
                    onChange={(e) => { setSearch(e.target.value); setProductId(""); }}
                    placeholder="Escribí para buscar..."
                    className="sc-focus"
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>

                {!selected && search && (
                  <div style={{
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    maxHeight: 220,
                    overflowY: "auto",
                    marginBottom: 14,
                    marginTop: -6,
                    background: "var(--panel-alt)",
                  }}>
                    {filtered.length === 0 && (
                      <div style={{ padding: 12, fontSize: 12.5, color: "var(--text-faint)" }}>No se encontraron productos.</div>
                    )}
                    {filtered.map((p) => {
                      const stockField = currentUser.assignedLocation === 'local2' ? 'stockLocal2' : (currentUser.assignedLocation === 'deposito' ? 'stockDeposito' : 'stockLocal1');
                      const availableStock = Number(p[stockField]) || 0;
                      const outOfStock = availableStock <= 0;
                      const disabled = outOfStock && !isAdmin;
                      return (
                        <div
                          key={p.id}
                          onClick={() => { if (disabled) return; setProductId(p.id); setSearch(""); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            borderBottom: "1px solid var(--border-soft)",
                            opacity: disabled ? 0.45 : 1,
                            transition: "background .12s ease",
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <ProductThumb product={p} size={28} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                            <div className="sc-mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                              {disabled ? "Sin stock disponible" : `Stock: ${availableStock} · $${fmtMoney(p.publicPrice)}`}
                            </div>
                          </div>
                          {disabled ? <Ban size={14} color="var(--red)" /> : <LevelBadge level={stockLevel({ ...p, quantity: availableStock })} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selected && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--panel-alt)",
                    border: "1px solid var(--cyan)55",
                    borderRadius: 7,
                    padding: 12,
                    marginBottom: 16,
                  }}>
                    <ProductThumb product={selected} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.name}</div>
                      <div className="sc-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>
                        Precio: <strong style={{ color: "var(--green)" }}>${fmtMoney(selected.publicPrice)}</strong>
                      </div>
                    </div>
                    <button type="button" onClick={() => setProductId("")} className="sc-btn" style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-faint)",
                      cursor: "pointer",
                      padding: 4,
                    }}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                    CANTIDAD
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="sc-focus"
                    style={{ ...inputStyle, width: 100 }}
                  />
                </div>

                <button type="button" onClick={submitManual} disabled={isSelling || isProcessing} className="sc-btn" style={{
                  marginTop: 8,
                  width: "100%",
                  background: "var(--cyan)",
                  color: "#0A1210",
                  border: "none",
                  borderRadius: 7,
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: isSelling || isProcessing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: isSelling || isProcessing ? 0.7 : 1,
                }}>
                  <ShoppingCart size={18} />
                  Agregar a la lista
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* PANEL DERECHO: Lista de Compra */}
      <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 500, position: "sticky", top: 20 }}>
        <div style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", background: "rgba(0,0,0,0.2)" }}>
            <h2 className="sc-display" style={{ fontSize: 18, margin: 0, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Lista de Compra
              <span style={{ fontSize: 13, background: "var(--cyan)22", color: "var(--cyan)", padding: "2px 8px", borderRadius: 999 }}>
                {purchaseList.length} ítems
              </span>
            </h2>
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }} className="purchase-list">
            {purchaseList.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <p style={{ fontSize: 14 }}>Escaneá productos para empezar</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {purchaseList.map((item, index) => (
                  <div key={item.tempId} className="purchase-item" style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--panel-alt)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    animation: "sc-fade .2s ease forwards",
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>{item.product.name}</div>
                      <div className="sc-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>
                        {item.qty} × ${fmtMoney(item.price)}
                      </div>
                    </div>
                    <div className="sc-mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", paddingRight: 8 }}>
                      ${fmtMoney(item.price * item.qty)}
                    </div>
                    <button 
                      onClick={() => removeFromList(item.tempId)}
                      disabled={isProcessing}
                      className="purchase-item-remove sc-focus"
                      title="Quitar y restaurar stock"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--red)",
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        padding: 8,
                        borderRadius: 6,
                        opacity: isProcessing ? 0.5 : 0.8,
                        transition: "all .15s ease",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer / Checkout */}
          <div style={{ borderTop: "1px solid var(--border)", background: "var(--panel)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 500 }}>TOTAL A PAGAR</div>
              <div className="sc-mono purchase-total" style={{ fontSize: 32, fontWeight: 700, color: "var(--green)", lineHeight: 1 }}>
                ${fmtMoney(purchaseTotal)}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <button
              type="button"
              onClick={confirmPayment}
              disabled={purchaseList.length === 0 || isProcessing}
              className="purchase-confirm-btn sc-btn sc-focus"
              style={{
                width: "100%",
                background: "var(--green)",
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "16px 20px",
                fontWeight: 700,
                fontSize: 16,
                cursor: purchaseList.length === 0 || isProcessing ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: purchaseList.length === 0 ? 0.3 : (isProcessing ? 0.7 : 1),
                boxShadow: purchaseList.length > 0 ? "0 4px 15px rgba(0, 255, 170, 0.2)" : "none",
                transition: "all .2s ease"
              }}
            >
              {isProcessing ? "PROCESANDO..." : `COBRAR $${fmtMoney(purchaseTotal)}`}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
