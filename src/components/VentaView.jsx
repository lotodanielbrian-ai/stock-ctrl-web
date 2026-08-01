import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, X, Ban, CheckCircle2, Camera } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { ProductThumb, LevelBadge, EmptyState } from "./GaugeBar";
import { stockLevel, fmtMoney, saleRevenue } from "../utils/helpers";
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
  const { products, sales, handleSell } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [mode, setMode] = useState("escaner"); // "escaner" | "manual"
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [isSelling, setIsSelling] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const selected = products.find((p) => p.id === productId);

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
    
    setIsSelling(true);
    try {
      await handleSell(selected.id, q, currentUser, paymentMethod);
      addToast(`Venta registrada: ${q} × ${selected.name}`, "success");
      setQty(1);
      setProductId("");
      setSearch("");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSelling(false);
    }
  };

  /* Scanner Mode */
  const scanRef = useRef(null);
  const [scanValue, setScanValue] = useState("");

  useEffect(() => {
    if (mode === "escaner" && scanRef.current) {
      scanRef.current.focus();
    }
  }, [mode]);

  const todaySales = sales.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    return s.userId === currentUser.id && d.toDateString() === now.toDateString();
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const todayTotal = todaySales.reduce((a, s) => a + saleRevenue(s), 0);

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
    
    setIsSelling(true);
    try {
      await handleSell(product.id, 1, currentUser, paymentMethod);
      addToast(`Vendido: ${product.name} ($${fmtMoney(product.publicPrice)})`, "success");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSelling(false);
    }
  };

  const handleCameraScan = async (code) => {
    setShowCamera(false);
    if (!code) return;
    
    const product = products.find((p) => p.barcode && p.barcode.trim() === code);
    if (!product) {
      addToast(`Código no reconocido: ${code}`, "error");
      return;
    }
    
    setIsSelling(true);
    try {
      await handleSell(product.id, 1, currentUser, paymentMethod);
      addToast(`Vendido: ${product.name} ($${fmtMoney(product.publicPrice)})`, "success");
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setIsSelling(false);
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

  return (
    <div className="sc-fadein" style={{ maxWidth: 720 }}>
      <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
        Registrar venta
        <HelpTag text="Modo escáner o búsqueda manual. Elegí el producto, ajustá la cantidad y seleccioná el medio de pago." />
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 16 }}>
        Operación a nombre de <strong style={{ color: "var(--cyan)" }}>{currentUser.name}</strong>.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          { k: "escaner", l: "Escáner de código de barras" },
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
        <EmptyState text="No hay productos cargados todavía. El administrador debe agregar productos para poder registrar ventas." />
      ) : (
        <>
          {mode === "escaner" ? (
            <div style={{ display: "flex", gap: 20 }} className="sc-mobile-flex-col">
              <div style={{ flex: 1 }}>
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
                    opacity: isSelling ? 0.6 : 1,
                    position: "relative",
                  }}
                >
                  <ScanBarcodeIcon />
                  <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "12px 0 14px" }}>
                    Apuntá con el lector óptico al código del producto
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
                    disabled={isSelling}
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
              </div>
              
              <div style={{ width: 260, flexShrink: 0 }}>
                <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, padding: 16 }}>
                  <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} compact />
                </div>
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
              placeholder="Escribí para buscar por nombre o código..."
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
                const outOfStock = (Number(p.quantity) || 0) <= 0;
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
                        {disabled ? "Sin stock disponible" : `Stock actual: ${p.quantity} · $${fmtMoney(p.publicPrice)}`}
                      </div>
                    </div>
                    {disabled ? <Ban size={14} color="var(--red)" /> : <LevelBadge level={stockLevel(p)} />}
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
                  Stock disponible: <strong style={{ color: "var(--cyan)" }}>{selected.quantity} u.</strong> · Precio: <strong style={{ color: "var(--green)" }}>${fmtMoney(selected.publicPrice)}</strong>
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

          <div style={{ display: "flex", gap: 24 }} className="sc-mobile-flex-col">
            <div>
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
            
            <div style={{ flex: 1 }}>
              <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>
          </div>

          <button type="button" onClick={submitManual} disabled={isSelling} className="sc-btn" style={{
            marginTop: 8,
            width: "100%",
            background: "var(--cyan)",
            color: "#0A1210",
            border: "none",
            borderRadius: 7,
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: isSelling ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: isSelling ? 0.7 : 1,
          }}>
          </button>
            </div>
          )}
        </>
      )}

      {/* TUS VENTAS REGISTRADAS HOY - NOW VISIBLE IN BOTH MODES */}
      <div style={{ marginTop: 22, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid var(--border-soft)" }}>
          <span className="sc-display" style={{ fontSize: 14, fontWeight: 600 }}>Tus ventas registradas hoy</span>
          <span className="sc-mono" style={{ fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>Total: ${fmtMoney(todayTotal)}</span>
        </div>
        {todaySales.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", padding: "12px 0" }}>
            Todavía no registraste ninguna venta hoy.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
            {todaySales.map((s) => {
              return (
                <div key={s.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12.5,
                  background: "var(--panel-alt)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 6,
                  padding: "8px 12px",
                }}>
                  <CheckCircle2 size={15} color="var(--green)" />
                  <span style={{ flex: 1, fontWeight: 500 }}>{s.productName || "(producto)"}</span>
                  <span className="sc-mono" style={{ color: "var(--text-faint)" }}>×{s.qty}</span>
                  <span className="sc-mono" style={{ fontWeight: 600, color: "var(--text)" }}>${fmtMoney(saleRevenue(s))}</span>
                </div>
              );
            })}
          </div>
        )}
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
