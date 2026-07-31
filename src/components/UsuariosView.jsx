import React, { useState } from "react";
import { Plus, Trash2, Pencil, KeyRound, Shield, Check, X, Users } from "lucide-react";
import { HelpTag } from "./HelpTag";
import { EmptyState } from "./GaugeBar";
import { fmtMoney } from "../utils/helpers";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "./Toast";

const emptyUser = {
  id: "",
  name: "",
  username: "",
  password: "",
  role: "vendedor",
  salary: 180000,
  commissionRate: 2.5,
};

export function UsuariosView() {
  const { users, handleSaveUser, handleDeleteUser } = useData();
  const { currentUser, isOnline } = useAuth();
  const { addToast } = useToast();
  const [form, setForm] = useState(emptyUser);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [err, setErr] = useState("");

  const startEdit = (u) => {
    setEditingId(u.id);
    setForm({ ...u });
    setErr("");
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyUser);
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || (!editingId && !form.password?.trim())) {
      setErr("Por favor completá los campos requeridos (Nombre, Usuario y Contraseña).");
      return;
    }

    // Check duplicate username
    const exists = users.find(
      (u) => u.username.toLowerCase() === form.username.trim().toLowerCase() && u.id !== editingId
    );
    if (exists) {
      setErr("Ese nombre de usuario ya está registrado por otro miembro.");
      return;
    }

    const payload = {
      id: editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      password: (form.password || "").trim(),
      role: form.role,
      salary: Number(form.salary) || 0,
      commissionRate: Number(form.commissionRate) || 0,
    };

    try {
      await handleSaveUser(payload, !editingId);
      addToast(editingId ? "Usuario actualizado" : "Usuario creado", "success");
      cancel();
    } catch (e) {
      setErr(e.message);
    }
  };

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
      <div style={{ marginBottom: 16 }}>
        <div className="sc-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>
          Gestión de Usuarios y Roles
          <HelpTag text="Panel de control de credenciales y permisos. El rol 'Administrador' posee acceso total, mientras que 'Vendedor' únicamente puede acceder a Dashboard, Registrar Ventas e Historial." />
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
          Alta, modificación de contraseñas y asignación de perfiles.
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Form panel */}
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
            <span>{editingId ? "Editar usuario" : "Crear nuevo usuario"}</span>
            {editingId && (
              <button type="button" onClick={cancel} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer" }}>
                <X size={15} />
              </button>
            )}
          </div>

          <label style={{ ...labelStyle, marginTop: 0 }}>NOMBRE Y APELLIDO</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Juan Pérez"
            className="sc-focus"
            style={inputStyle}
          />

          <label style={labelStyle}>NOMBRE DE USUARIO (LOGIN)</label>
          <input
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Ej: juanperez"
            className="sc-focus sc-mono"
            style={inputStyle}
          />

          <label style={labelStyle}>{editingId ? "NUEVA CONTRASEÑA (Dejar en blanco para no cambiar)" : "CONTRASEÑA"}</label>
          <input
            required={!editingId}
            type="text"
            value={form.password || ""}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId ? "••••••••" : "Ej: ventas123"}
            className="sc-focus sc-mono"
            style={inputStyle}
          />

          <label style={labelStyle}>ROL / PERMISO</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="sc-focus"
            style={inputStyle}
          >
            <option value="vendedor">Vendedor (Carga de ventas e historial)</option>
            <option value="admin">Administrador (Acceso total)</option>
          </select>

          {form.role === "vendedor" && (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>SUELDO BÁSICO ($)</label>
                  <input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="180000"
                    className="sc-focus sc-mono"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>COMISIÓN (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                    placeholder="2.5"
                    className="sc-focus sc-mono"
                    style={inputStyle}
                  />
                </div>
              </div>
            </>
          )}

          {err && <div style={{ fontSize: 11.5, color: "var(--red)", marginTop: 10, fontWeight: 500 }}>{err}</div>}

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
              {editingId ? <Check size={14} /> : <Plus size={14} />}
              {editingId ? "Guardar cambios" : "Crear usuario"}
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

        {/* Users list table */}
        <div style={{ flex: 1, minWidth: 380 }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
                    <th className="sc-mono" style={thStyle}>NOMBRE</th>
                    <th className="sc-mono" style={thStyle}>USUARIO</th>
                    <th className="sc-mono" style={thStyle}>CONTRASEÑA</th>
                    <th className="sc-mono" style={thStyle}>ROL</th>
                    <th className="sc-mono" style={thStyle}>SUELDO BÁSICO</th>
                    <th className="sc-mono" style={{ ...thStyle, textAlign: "right" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isDeleting = confirmDelete === u.id;
                    const isSelf = u.id === "admin";
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>
                          {u.name}
                        </td>
                        <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--cyan)" }}>
                          {u.username}
                        </td>
                        <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 12, color: "var(--text-faint)" }}>
                          {isOnline ? "••••••••" : u.password}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="sc-mono" style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 7px",
                            borderRadius: 4,
                            background: u.role === "admin" ? "#45D9C71A" : "var(--panel-alt)",
                            color: u.role === "admin" ? "var(--cyan)" : "var(--text-dim)",
                            border: `1px solid ${u.role === "admin" ? "var(--cyan)55" : "var(--border)"}`,
                          }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="sc-mono" style={{ padding: "12px 14px", fontSize: 12 }}>
                          ${fmtMoney(u.salary)}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right" }}>
                          {isDeleting ? (
                            <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                              <span style={{ fontSize: 10, color: "var(--red)", fontWeight: 600 }}>¿Eliminar?</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await handleDeleteUser(u.id);
                                    addToast("Usuario eliminado", "success");
                                  } catch (e) {
                                    addToast(e.message, "error");
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
                                onClick={() => startEdit(u)}
                                className="sc-btn sc-focus"
                                title="Editar usuario"
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
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(u.id)}
                                  className="sc-btn sc-focus"
                                  title="Eliminar usuario"
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
                              )}
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
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 10,
  color: "var(--text-faint)",
  letterSpacing: "0.06em",
  fontWeight: 600,
};
