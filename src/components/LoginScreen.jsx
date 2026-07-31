import React, { useState } from "react";
import { Boxes, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginScreen() {
  const { handleLogin, handleResetUsers, isOnline } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [justReset, setJustReset] = useState(false);

  const submit = async () => {
    const uInput = username.trim();
    const pInput = password.trim();
    if (!uInput || !pInput) {
      setErr("Ingresá usuario y contraseña.");
      return;
    }
    
    setLoading(true);
    setErr("");
    try {
      await handleLogin(uInput, pInput);
    } catch (e) {
      setErr(e.message || "Error al iniciar sesión");
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") submit();
  };

  const doReset = () => {
    if (isOnline) return;
    handleResetUsers();
    setJustReset(true);
    setErr("");
    setTimeout(() => setJustReset(false), 3000);
  };

  const inputStyle = {
    width: "100%",
    background: "var(--panel-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 11px",
    color: "var(--text)",
    fontSize: 13.5,
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div className="sc-root sc-fadein" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundImage: "radial-gradient(circle at 20% 20%, #182028 0%, #12151A 55%)",
      padding: 20,
    }}>
      <div style={{
        width: 380,
        maxWidth: "100%",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "32px 28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "#45D9C71A",
            border: "1px solid #45D9C755",
            display: "grid",
            placeItems: "center",
          }}>
            <Boxes size={18} color="var(--cyan)" />
          </div>
          <div>
            <div className="sc-display" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>
              STOCK<span style={{ color: "var(--cyan)" }}>//</span>CTRL
            </div>
            <div className="sc-mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.1em" }}>
              CONTROL DE INVENTARIO
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "18px 0 20px" }}>
          Ingresá con tu {isOnline ? 'email' : 'usuario'} para acceder al sistema.
        </p>

        <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", marginBottom: 6, fontWeight: 600 }}>
          {isOnline ? 'EMAIL' : 'USUARIO'}
        </label>
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={onKeyDown}
          className="sc-focus"
          style={inputStyle}
          placeholder={isOnline ? "correo@ejemplo.com" : "admin"}
          disabled={loading}
        />

        <label style={{ fontSize: 11, color: "var(--text-dim)", display: "block", margin: "14px 0 6px", fontWeight: 600 }}>
          CONTRASEÑA
        </label>
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onKeyDown}
          className="sc-focus"
          style={inputStyle}
          placeholder="••••••••"
          disabled={loading}
        />

        <label style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
          fontSize: 11.5,
          color: "var(--text-faint)",
          cursor: "pointer",
        }}>
          <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} disabled={loading} />
          Mostrar contraseña
        </label>

        {err && (
          <div style={{ color: "var(--red)", fontSize: 12, marginTop: 12, fontWeight: 500 }}>
            {err}
          </div>
        )}

        <button type="button" onClick={submit} disabled={loading} className="sc-btn sc-focus" style={{
          marginTop: 22,
          width: "100%",
          background: "var(--cyan)",
          color: "#0A1210",
          border: "none",
          borderRadius: 7,
          padding: "11px 0",
          fontWeight: 600,
          fontSize: 13.5,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? (
            <>Ingresando <Loader2 size={15} className="lucide-spin" /></>
          ) : (
            <>Ingresar <ChevronRight size={15} /></>
          )}
        </button>

        {!isOnline && (
          <>
            <div style={{
              marginTop: 22,
              paddingTop: 16,
              borderTop: "1px solid var(--border-soft)",
              fontSize: 10.5,
              color: "var(--text-faint)",
              lineHeight: 1.6,
            }}>
              Modo Offline (Demo): admin / admin123 · vendedor1 / venta123.
            </div>

            <button
              type="button"
              onClick={doReset}
              className="sc-btn sc-focus"
              style={{
                marginTop: 12,
                width: "100%",
                background: "transparent",
                border: "1px solid var(--border)",
                color: justReset ? "var(--green)" : "var(--text-faint)",
                borderRadius: 6,
                padding: "7px 0",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {justReset ? "Usuarios restablecidos ✓ — probá de nuevo" : "¿No podés entrar? Restablecer usuarios de fábrica"}
            </button>
          </>
        )}
      </div>
      
      {/* Loading spinner keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes lucide-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lucide-spin { animation: lucide-spin 1.2s linear infinite; }
      `}} />
    </div>
  );
}
