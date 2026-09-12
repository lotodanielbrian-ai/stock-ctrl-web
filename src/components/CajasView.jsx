import React, { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Printer, Trash2, Usb, WifiOff } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { useData } from "../contexts/DataContext";
import { useToast } from "./Toast";
import { fmtDate, fmtMoney, uid } from "../utils/helpers";
import { DEFAULT_FISCAL, LOCATIONS, expectedCash, formatRegisterNumber, locationLabel, registerLabel } from "../utils/caja";
import {
  connectSerialPrinter,
  disconnectSerialPrinter,
  getPrinterPrefs,
  isSerialConnected,
  printThermal,
  savePrinterPrefs,
  serialSupported,
} from "../services/printerService";

const emptyReg = { id: "", number: "04", name: "CAJA", location: "local1", isActive: true, afipPuntoVenta: 1 };

export function CajasView() {
  const {
    cashRegisters, cashSessions, cashMovements, fiscalSettings, cajaSynced,
    handleSaveRegister, handleDeleteRegister, handleSaveFiscal,
  } = useData();
  const { addToast } = useToast();

  const [form, setForm] = useState(emptyReg);
  const [editingId, setEditingId] = useState(null);
  const [fiscal, setFiscal] = useState(fiscalSettings || DEFAULT_FISCAL);
  const [prefs, setPrefs] = useState(getPrinterPrefs);
  const [serialOn, setSerialOn] = useState(isSerialConnected());

  useEffect(() => {
    setFiscal(fiscalSettings || DEFAULT_FISCAL);
  }, [fiscalSettings]);

  const sessions = useMemo(
    () => [...(cashSessions || [])].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt)),
    [cashSessions]
  );

  const saveRegister = async (e) => {
    e.preventDefault();
    try {
      await handleSaveRegister({
        ...form,
        id: editingId || form.id || uid(),
        number: formatRegisterNumber(form.number),
      }, !editingId);
      addToast(editingId ? "Caja actualizada" : "Caja creada", "success");
      setForm(emptyReg);
      setEditingId(null);
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const saveFiscal = async (e) => {
    e.preventDefault();
    try {
      await handleSaveFiscal(fiscal);
      addToast("Datos fiscales guardados", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const persistPrefs = (next) => {
    setPrefs(next);
    savePrinterPrefs(next);
  };

  const connectPrinter = async () => {
    try {
      await connectSerialPrinter(prefs.baudRate);
      setSerialOn(true);
      persistPrefs({ ...prefs, mode: "serial" });
      addToast("Impresora térmica conectada", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  const testPrint = async () => {
    const sample = {
      ticketNumber: "T-TEST",
      invoiceType: "ticket",
      paymentMethod: "efectivo",
      paymentLabel: "Efectivo",
      total: 16500,
      cashReceived: 20000,
      changeGiven: 3500,
      createdAt: new Date().toISOString(),
      lines: [
        { productName: "Playadito 500g", qty: 1, unitPrice: 4000, lineTotal: 4000 },
        { productName: "Monster 473ml", qty: 2, unitPrice: 3500, lineTotal: 7000 },
        { productName: "Red Bull 250ml", qty: 1, unitPrice: 5500, lineTotal: 5500 },
      ],
    };
    try {
      if (prefs.mode === "serial") {
        if (!isSerialConnected()) await connectSerialPrinter(prefs.baudRate);
        await printThermal(sample, { fiscal, openDrawer: false });
        addToast("Test ESC/POS enviado", "success");
      } else {
        addToast("Modo navegador: el ticket de cobro se imprime desde Caja (F4).", "success");
      }
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  return (
    <div className="sc-fadein" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="sc-display" style={{ fontSize: 17, fontWeight: 600 }}>
          Cajas y fiscal
          <HelpTag text="Cajas numeradas, historial de arqueos, datos AFIP e impresora térmica. La emisión electrónica real requiere certificados en el servidor." />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
          {cajaSynced ? "Sincronizado con Supabase." : "Modo local: aplicá la migración 007 para compartir cajas entre usuarios."}
        </p>
      </div>

      <section className="caja-admin-card">
        <h3><Banknote size={16} /> Cajas numeradas</h3>
        <form onSubmit={saveRegister} className="caja-admin-form">
          <input className="sc-focus sc-mono" style={{ width: 70 }} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="01" />
          <input className="sc-focus" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CAJA1" required />
          <select className="sc-focus caja-select" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
            {Object.entries(LOCATIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className="sc-focus sc-mono" style={{ width: 80 }} type="number" min={1} value={form.afipPuntoVenta} onChange={(e) => setForm({ ...form, afipPuntoVenta: e.target.value })} title="Punto de venta AFIP" />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Activa
          </label>
          <button type="submit" className="sc-btn caja-btn-primary"><Plus size={14} /> {editingId ? "Guardar" : "Agregar"}</button>
          {editingId && (
            <button type="button" className="sc-btn caja-btn-ghost" onClick={() => { setEditingId(null); setForm(emptyReg); }}>Cancelar</button>
          )}
        </form>
        <table className="caja-admin-table">
          <thead>
            <tr><th>N°</th><th>Nombre</th><th>Local</th><th>PV AFIP</th><th>Estado</th><th /></tr>
          </thead>
          <tbody>
            {cashRegisters.map((r) => (
              <tr key={r.id}>
                <td className="sc-mono">{r.number}</td>
                <td>{r.name}</td>
                <td>{locationLabel(r.location)}</td>
                <td className="sc-mono">{r.afipPuntoVenta}</td>
                <td>{r.isActive ? "Activa" : "Inactiva"}</td>
                <td>
                  <button type="button" className="caja-icon-btn" onClick={() => { setEditingId(r.id); setForm(r); }}>✎</button>
                  <button type="button" className="caja-icon-btn" onClick={async () => {
                    try { await handleDeleteRegister(r.id); addToast("Caja eliminada", "success"); }
                    catch (err) { addToast(err.message, "error"); }
                  }}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="caja-admin-card">
        <h3>Arqueos recientes</h3>
        {sessions.length === 0 ? (
          <p className="caja-hint">Todavía no hay sesiones. Se abren desde Registrar venta.</p>
        ) : (
          <table className="caja-admin-table">
            <thead>
              <tr><th>Caja</th><th>Cajero</th><th>Apertura</th><th>Cierre</th><th>Fondo</th><th>Esperado</th><th>Contado</th><th>Dif.</th></tr>
            </thead>
            <tbody>
              {sessions.slice(0, 20).map((s) => {
                const reg = cashRegisters.find((r) => r.id === s.registerId);
                const esperado = s.status === "open" ? expectedCash(s, cashMovements) : s.expectedCash;
                return (
                  <tr key={s.id}>
                    <td>{reg ? registerLabel(reg) : "—"}</td>
                    <td>{s.userName}</td>
                    <td className="sc-mono">{fmtDate(s.openedAt)}</td>
                    <td className="sc-mono">{s.closedAt ? fmtDate(s.closedAt) : "Abierta"}</td>
                    <td className="sc-mono">${fmtMoney(s.openingFloat)}</td>
                    <td className="sc-mono">${fmtMoney(esperado)}</td>
                    <td className="sc-mono">{s.countedCash == null ? "—" : `$${fmtMoney(s.countedCash)}`}</td>
                    <td className="sc-mono">{s.difference == null ? "—" : `$${fmtMoney(s.difference)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="caja-admin-card">
        <h3>Datos fiscales / AFIP</h3>
        <p className="caja-hint">
          La factura A/B/C se ofrece en el cobro. Sin certificados de servidor (AFIP_CUIT, AFIP_CERT, AFIP_KEY) se imprime como comprobante no fiscal.
        </p>
        <form onSubmit={saveFiscal} className="caja-admin-form caja-admin-form-wrap">
          <input className="sc-focus" placeholder="Razón social" value={fiscal.razonSocial} onChange={(e) => setFiscal({ ...fiscal, razonSocial: e.target.value })} />
          <input className="sc-focus sc-mono" placeholder="CUIT" value={fiscal.cuit} onChange={(e) => setFiscal({ ...fiscal, cuit: e.target.value })} />
          <input className="sc-focus" placeholder="Domicilio" value={fiscal.domicilio} onChange={(e) => setFiscal({ ...fiscal, domicilio: e.target.value })} />
          <input className="sc-focus" placeholder="IIBB" value={fiscal.iibb} onChange={(e) => setFiscal({ ...fiscal, iibb: e.target.value })} />
          <select className="sc-focus caja-select" value={fiscal.condicionIva} onChange={(e) => setFiscal({ ...fiscal, condicionIva: e.target.value })}>
            <option value="monotributo">Monotributo</option>
            <option value="responsable_inscripto">Responsable inscripto</option>
            <option value="exento">Exento</option>
          </select>
          <select className="sc-focus caja-select" value={fiscal.afipAmbiente} onChange={(e) => setFiscal({ ...fiscal, afipAmbiente: e.target.value })}>
            <option value="homologacion">Homologación</option>
            <option value="produccion">Producción</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={!!fiscal.afipEnabled} onChange={(e) => setFiscal({ ...fiscal, afipEnabled: e.target.checked })} />
            Intentar AFIP al facturar
          </label>
          <button type="submit" className="sc-btn caja-btn-primary">Guardar fiscal</button>
        </form>
      </section>

      <section className="caja-admin-card">
        <h3><Printer size={16} /> Impresora</h3>
        <div className="caja-admin-form">
          <select className="sc-focus caja-select" value={prefs.mode} onChange={(e) => persistPrefs({ ...prefs, mode: e.target.value })}>
            <option value="browser">Navegador (80 mm / A4)</option>
            <option value="serial">Térmica nativa (Web Serial / ESC/POS)</option>
          </select>
          {prefs.mode === "serial" && (
            <>
              <select className="sc-focus caja-select" value={prefs.baudRate} onChange={(e) => persistPrefs({ ...prefs, baudRate: Number(e.target.value) })}>
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={115200}>115200</option>
              </select>
              <button type="button" className="sc-btn caja-btn-primary" onClick={connectPrinter} disabled={!serialSupported()}>
                <Usb size={14} /> {serialOn ? "Reconectar" : "Conectar"}
              </button>
              {serialOn && (
                <button type="button" className="sc-btn caja-btn-ghost" onClick={async () => { await disconnectSerialPrinter(); setSerialOn(false); }}>
                  <WifiOff size={14} /> Desconectar
                </button>
              )}
            </>
          )}
          <button type="button" className="sc-btn caja-btn-ghost" onClick={testPrint}>Test de impresión</button>
        </div>
        {!serialSupported() && prefs.mode === "serial" && (
          <p className="caja-hint">Web Serial requiere Chrome o Edge en escritorio, y una impresora USB/serial ESC/POS.</p>
        )}
      </section>
    </div>
  );
}
