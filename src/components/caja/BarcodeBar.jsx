import React from "react";
import { Camera, Search } from "lucide-react";

export function BarcodeBar({
  barcodeRef,
  qtyRef,
  searchRef,
  scanValue,
  setScanValue,
  onScanSubmit,
  qty,
  setQty,
  search,
  setSearch,
  onSearchFocus,
  onOpenCamera,
  disabled,
}) {
  return (
    <div className="caja-barcode-bar">
      <label className="caja-field grow">
        <span>F1 · Código de barras</span>
        <input
          ref={barcodeRef}
          className="sc-focus sc-mono caja-barcode-input"
          value={scanValue}
          disabled={disabled}
          placeholder="Pitar o tipear y Enter"
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onScanSubmit();
            }
          }}
        />
      </label>
      <label className="caja-field">
        <span>F2 · Cantidad</span>
        <input
          ref={qtyRef}
          className="sc-focus sc-mono caja-qty-big"
          type="number"
          min={1}
          value={qty}
          disabled={disabled}
          onChange={(e) => setQty(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <label className="caja-field grow">
        <span>F3 · Buscar</span>
        <div className="caja-search-wrap">
          <Search size={14} />
          <input
            ref={searchRef}
            className="sc-focus"
            value={search}
            disabled={disabled}
            placeholder="Nombre o código…"
            onChange={(e) => setSearch(e.target.value)}
            onFocus={onSearchFocus}
          />
        </div>
      </label>
      <button
        type="button"
        className="sc-btn sc-focus caja-btn-ghost"
        disabled={disabled}
        onClick={onOpenCamera}
      >
        <Camera size={16} /> Cámara
      </button>
    </div>
  );
}
