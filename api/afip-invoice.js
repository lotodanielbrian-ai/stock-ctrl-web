/**
 * AFIP electronic invoice endpoint.
 *
 * Real issuance (WSAA + WSFE) needs a server-side CUIT certificate and
 * private key. Until those are configured this returns NOT_CONFIGURED so
 * the POS can still close the sale as an internal / non-fiscal ticket.
 *
 * Env (when ready):
 *   AFIP_CUIT
 *   AFIP_CERT (PEM)
 *   AFIP_KEY (PEM)
 *   AFIP_ENV = homologacion | produccion
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "METHOD", message: "Método no permitido" });
  }

  const configured = !!(process.env.AFIP_CUIT && process.env.AFIP_CERT && process.env.AFIP_KEY);
  if (!configured) {
    return res.status(501).json({
      code: "NOT_CONFIGURED",
      message:
        "AFIP no está configurado en el servidor. El cobro se guarda como comprobante interno. Para emitir factura electrónica cargá AFIP_CUIT, AFIP_CERT y AFIP_KEY.",
    });
  }

  return res.status(501).json({
    code: "NOT_IMPLEMENTED",
    message:
      "Certificados AFIP detectados, pero la emisión WSAA/WSFE todavía no está cableada. Usá ticket interno o un controlador fiscal externo.",
  });
}
