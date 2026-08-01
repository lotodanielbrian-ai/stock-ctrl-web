import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function CameraScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    // We delay slightly to ensure the div is painted before initializing the scanner
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Pause scanning immediately to prevent multiple triggers for the same code
          scanner.pause();
          onScan(decodedText);
          // Resume after a moment, in case they want to scan again
          setTimeout(() => scanner.resume(), 1500);
        },
        (error) => {
          // Ignored: html5-qrcode frequently emits matching errors when no code is found
        }
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.85)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }}>
      <div style={{ 
        width: "100%", maxWidth: 400, background: "var(--panel)", borderRadius: 12, padding: 16,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Escáner de Cámara</span>
          <button onClick={onClose} className="sc-btn" style={{ background: "transparent", color: "var(--text-faint)", border: "none", padding: 4 }}>
            Cerrar
          </button>
        </div>
        
        {/* Container for html5-qrcode */}
        <div id="reader" style={{ width: "100%", borderRadius: 8, overflow: "hidden" }}></div>
        
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 12 }}>
          Apunta la cámara al código de barras o QR del producto.
        </div>
      </div>
    </div>
  );
}
