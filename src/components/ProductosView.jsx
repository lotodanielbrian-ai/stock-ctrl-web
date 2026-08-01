import React, { useState, useRef } from "react";
import { Plus, Trash2, Pencil, ImagePlus, Search, X, Check, Save, FileSpreadsheet, Camera } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { ProductThumb, LevelBadge, EmptyState } from "./GaugeBar";
import { stockLevel, fmtMoney, fmtDate, resizeImage, exportProductsToExcel } from "../utils/helpers";
import { useData } from "../contexts/DataContext";
import { useToast } from "./Toast";
import { CameraScanner } from "./CameraScanner";

const emptyForm = {
  name: "",
  photo: "",
  costPrice: "",
  publicPrice: "",
  stockLocal: "",
  stockDeposito: "",
  minStock: 5,
  category: "",
  barcode: "",
};

export function ProductosView() {
  const { products, handleSaveProduct, handleDeleteProduct } = useData();
  const { addToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...p });
    setUploadErr("");
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUploadErr("");
  };

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadErr("");
    try {
      const b64 = await resizeImage(file);
      setForm((f) => ({ ...f, photo: b64 }));
    } catch (e) {
      setUploadErr("No se pudo procesar la imagen. Probá con otra imagen (JPG/PNG).");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: form.name.trim(),
      photo: form.photo || "",
      costPrice: Number(form.costPrice) || 0,
      publicPrice: Number(form.publicPrice) || 0,
      stockLocal: Number(form.stockLocal) || 0,
      stockDeposito: Number(form.stockDeposito) || 0,
      minStock: Number(form.minStock) || 0,
      category: form.category ? form.category.trim() : "General",
      barcode: (form.barcode || "").trim(),
      lastRestock: editingId ? form.lastRestock || new Date().toISOString() : new Date().toISOString(),
    };
    try {
      await handleSaveProduct(payload, !editingId);
      addToast(editingId ? "Producto actualizado" : "Producto agregado", "success");
      cancel();
    } catch (error) {
      addToast(error.message, "error");
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
    (p.barcode && p.barcode.includes(search))
  );

  const inputStyle = {
    width: "100%",
    background: "var(--panel-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 11px",
    color: "var(--text)",
    fontSize: 13,
  };

  const labelStyle = {
    fontSize: 11,
    color: "var(--text-dim)",
    display: "block",
    marginBottom: 5,
    marginTop: 12,
    fontWeight: 600,
  };

  return (
    <div className="sc-fadein">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>
            Gestión de Productos
            <HelpTag text="Panel exclusivo de administradores para agregar, modificar o eliminar productos del inventario. Incluye carga de imágenes comprimidas y códigos de barra para lectora óptica." />
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
            Catálogo completo de productos y parámetros de control.
          </p>
        </div>

        <button
          onClick={() => exportProductsToExcel(products)}
          className="sc-btn sc-focus"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--panel-alt)",
            border: "1px solid var(--border)",
            color: "var(--green)",
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FileSpreadsheet size={14} /> Exportar Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* FORM SIDEBAR */}
        <form onSubmit={submit} style={{
          width: 320,
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: 18,
          flexShrink: 0,
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        }}>
          <div className="sc-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{editingId ? "Editar producto" : "Nuevo producto"}</span>
            {editingId && (
              <button type="button" onClick={cancel} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer" }}>
                <X size={15} />
              </button>
            )}
          </div>

          <label style={{ ...labelStyle, marginTop: 0 }}>FOTO DEL PRODUCTO</label>
          <div
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 100,
              borderRadius: 7,
              border: "1px dashed var(--border)",
              cursor: "pointer",
              marginBottom: form.photo ? 6 : 4,
              background: "var(--panel-alt)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {form.photo ? (
              <img src={form.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-faint)" }}>
                <ImagePlus size={20} />
                <span style={{ fontSize: 11, marginTop: 4 }}>{uploading ? "Comprimiendo..." : "Subir imagen (opcional)"}</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { handleImage(e.target.files && e.target.files[0]); e.target.value = ""; }}
          />
          {uploadErr && <div style={{ fontSize: 11, color: "var(--red)", marginBottom: 6 }}>{uploadErr}</div>}
          {form.photo && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, photo: "" }))}
              className="sc-btn"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--red)",
                fontSize: 11,
                cursor: "pointer",
                padding: "2px 0 8px",
              }}
            >
              Quitar foto
            </button>
          )}

          <label style={labelStyle}>NOMBRE DEL PRODUCTO</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Café Colombia 500g"
            className="sc-focus"
            style={inputStyle}
          />

          <label style={labelStyle}>CÓDIGO DE BARRAS (PARA LECTORA)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="Ej: 779123456789"
              className="sc-focus sc-mono"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              className="sc-btn sc-focus"
              style={{
                background: "var(--panel-alt)",
                border: "1px solid var(--border)",
                color: "var(--cyan)",
                borderRadius: 6,
                padding: "0 12px",
                cursor: "pointer",
              }}
              title="Escanear con celular"
            >
              <Camera size={18} />
            </button>
          </div>

          <label style={labelStyle}>CATEGORÍA</label>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Ej: Bebidas, Electrónica..."
            className="sc-focus"
            style={inputStyle}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PRECIO COSTO ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                placeholder="0.00"
                className="sc-focus sc-mono"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>PRECIO VENTA ($)</label>
              <input
                type="number"
                step="0.01"
                value={form.publicPrice}
                onChange={(e) => setForm({ ...form, publicPrice: e.target.value })}
                placeholder="0.00"
                className="sc-focus sc-mono"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>STOCK LOCAL</label>
              <input
                type="number"
                value={form.stockLocal}
                onChange={(e) => setForm({ ...form, stockLocal: e.target.value })}
                placeholder="0"
                className="sc-focus sc-mono"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>STOCK DEPÓSITO</label>
              <input
                type="number"
                value={form.stockDeposito}
                onChange={(e) => setForm({ ...form, stockDeposito: e.target.value })}
                placeholder="0"
                className="sc-focus sc-mono"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>STOCK MÍNIMO</label>
              <input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="5"
                className="sc-focus sc-mono"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button type="submit" className="sc-btn sc-focus" style={{
              flex: 1,
              background: "var(--cyan)",
              color: "#0A1210",
              border: "none",
              borderRadius: 7,
              padding: "10px 0",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}>
              {editingId ? <Save size={14} /> : <Plus size={14} />}
              {editingId ? "Guardar cambios" : "Agregar producto"}
            </button>
            {editingId && (
              <button type="button" onClick={cancel} className="sc-btn sc-focus" style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
                borderRadius: 7,
                padding: "10px 12px",
                fontSize: 13,
                cursor: "pointer",
              }}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* TABLE SIDE */}
        <div style={{ flex: 1, minWidth: 400 }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} color="var(--text-faint)" style={{ position: "absolute", left: 12, top: 12 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nombre, categoría o código..."
              className="sc-focus"
              style={{ ...inputStyle, paddingLeft: 34, fontSize: 13 }}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState text="No hay productos que coincidan con la búsqueda." />
          ) : (
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                      <th style={{ width: 44, padding: "10px 14px" }}></th>
                      <th className="sc-mono" style={thStyle}>PRODUCTO</th>
                      <th className="sc-mono" style={thStyle}>CATEGORÍA</th>
                      <th className="sc-mono" style={thStyle}>CÓDIGO</th>
                      <th className="sc-mono" style={thStyle}>STOCK</th>
                      <th className="sc-mono" style={thStyle}>COSTO</th>
                      <th className="sc-mono" style={thStyle}>VENTA</th>
                      <th className="sc-mono" style={{ ...thStyle, textAlign: "right" }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const lvl = stockLevel(p);
                      const isDeleting = confirmDelete === p.id;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                          <td style={{ padding: "9px 0 9px 12px" }}>
                            <ProductThumb product={p} size={32} />
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 500 }}>
                            {p.name}
                          </td>
                          <td style={{ padding: "9px 12px", fontSize: 12, color: "var(--text-dim)" }}>
                            {p.category || "General"}
                          </td>
                          <td className="sc-mono" style={{ padding: "9px 12px", fontSize: 11, color: "var(--text-faint)" }}>
                            {p.barcode || "—"}
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                                <span style={{ color: "var(--text-dim)" }}>Local:</span>
                                <strong className="sc-mono" style={{ color: "var(--text)" }}>{p.stockLocal}</strong>
                                <LevelBadge level={stockLevel({ ...p, quantity: p.stockLocal })} />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                                <span style={{ color: "var(--text-dim)" }}>Depósito:</span>
                                <strong className="sc-mono" style={{ color: "var(--text)" }}>{p.stockDeposito}</strong>
                              </div>
                            </div>
                          </td>
                          <td className="sc-mono" style={{ padding: "9px 12px", fontSize: 12, color: "var(--text-dim)" }}>
                            ${fmtMoney(p.costPrice)}
                          </td>
                          <td className="sc-mono" style={{ padding: "9px 12px", fontSize: 12.5, fontWeight: 600, color: "var(--cyan)" }}>
                            ${fmtMoney(p.publicPrice)}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right" }}>
                            {isDeleting ? (
                              <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 600 }}>¿Eliminar?</span>
                                <button
                                  type="button"
                                  onClick={async () => { 
                                    try {
                                      await handleDeleteProduct(p.id);
                                      addToast("Producto eliminado", "success");
                                    } catch(err) {
                                      addToast(err.message, "error");
                                    }
                                    setConfirmDelete(null); 
                                  }}
                                  className="sc-btn"
                                  style={{ background: "var(--red)", border: "none", borderRadius: 4, width: 24, height: 24, display: "grid", placeItems: "center", cursor: "pointer" }}
                                >
                                  <Check size={13} color="#fff" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  className="sc-btn"
                                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, width: 24, height: 24, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text-dim)" }}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "inline-flex", gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => startEdit(p)}
                                  className="sc-btn sc-focus"
                                  title="Editar producto"
                                  style={{
                                    background: "var(--panel-alt)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    width: 28,
                                    height: 28,
                                    display: "grid",
                                    placeItems: "center",
                                    cursor: "pointer",
                                    color: "var(--text-dim)",
                                  }}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(p.id)}
                                  className="sc-btn sc-focus"
                                  title="Eliminar producto"
                                  style={{
                                    background: "transparent",
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    width: 28,
                                    height: 28,
                                    display: "grid",
                                    placeItems: "center",
                                    cursor: "pointer",
                                    color: "var(--red)",
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraScanner
          onScan={(code) => {
            setForm(prev => ({ ...prev, barcode: code }));
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 10,
  color: "var(--text-faint)",
  letterSpacing: "0.06em",
  fontWeight: 600,
};
