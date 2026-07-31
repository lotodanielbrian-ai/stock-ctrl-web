import React, { useState } from "react";
import { HelpCircle } from "lucide-react";

export function HelpTag({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sc-btn sc-focus"
        title="Qué hace esta sección"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          marginLeft: 7,
          border: `1px solid ${open ? "var(--cyan)" : "var(--border)"}`,
          background: open ? "#45D9C71A" : "transparent",
          color: open ? "var(--cyan)" : "var(--text-faint)",
          cursor: "pointer",
          verticalAlign: "middle",
        }}
      >
        <HelpCircle size={11} />
      </button>
      {open && <div className="sc-help-box sc-fadein">{text}</div>}
    </span>
  );
}
