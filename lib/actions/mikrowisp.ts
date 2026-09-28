"use server";

export type FacturaVencida = {
  id: number;
  vencimiento: string;
  total: string;
  cobrado: string;
  pendiente: string;
};

async function mikrowispFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = process.env.MIKROWISP_API_URL;
  const token = process.env.MIKROWISP_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("MIKROWISP_API_URL o MIKROWISP_TOKEN no configurados");
  }

  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...body }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Mikrowisp respondió ${res.status}`);
  }

  return res.json();
}

function candidatosCedula(input: string): string[] {
  const clean = input.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[VEJPG]-/.test(clean)) return [clean];
  const digits = clean.replace(/[^0-9]/g, "");
  if (!digits) return [clean];
  return [`V-${digits}`, `E-${digits}`, digits];
}

async function buscarClientePorCedula(
  cedula: string
): Promise<{ id: number; nombre: string; estado: string } | null> {
  for (const candidato of candidatosCedula(cedula)) {
    const res = await mikrowispFetch<{
      estado: string;
      datos?: { id: number; nombre: string; estado: string }[];
    }>("/GetClientsDetails", { cedula: candidato });
    const datos = res.datos?.[0];
    if (datos?.id) return { id: datos.id, nombre: datos.nombre, estado: datos.estado };
  }
  return null;
}

async function obtenerFacturasVencidas(idcliente: number): Promise<FacturaVencida[]> {
  const facturasRes = await mikrowispFetch<{
    estado: string;
    facturas?: {
      id: number;
      vencimiento: string;
      total: string;
      cobrado: string;
      estado: string;
    }[];
  }>("/GetInvoices", { idcliente, estado: 1 });

  return (facturasRes.facturas ?? [])
    .filter((f) => {
      const pendiente = parseFloat(f.total) - parseFloat(f.cobrado || "0");
      return f.estado?.toLowerCase().includes("vencid") && pendiente > 0;
    })
    .map((f) => {
      const pendiente = (parseFloat(f.total) - parseFloat(f.cobrado || "0")).toFixed(2);
      return { id: f.id, vencimiento: f.vencimiento, total: f.total, cobrado: f.cobrado, pendiente };
    });
}

export async function buscarFacturasVencidas(cedula: string): Promise<{
  idcliente?: number;
  clienteNombre?: string;
  clienteEstado?: string;
  facturas?: FacturaVencida[];
  error?: string;
  notFound?: boolean;
}> {
  const cedulaTrim = cedula.trim();
  if (!cedulaTrim) return { error: "Cédula requerida" };

  try {
    const cliente = await buscarClientePorCedula(cedulaTrim);
    if (!cliente) return { notFound: true };

    const facturas = await obtenerFacturasVencidas(cliente.id);
    return {
      idcliente: cliente.id,
      clienteNombre: cliente.nombre,
      clienteEstado: cliente.estado,
      facturas,
    };
  } catch (error) {
    console.error("Error al buscar facturas vencidas:", error instanceof Error ? error.message : error);
    return { error: "No se pudo conectar con Mikrowisp." };
  }
}

export type ConfirmarPagoInput = {
  cantidad?: number;
  comision?: number;
  idtransaccion?: string;
  fechalimite?: string;
  nota?: string;
};

export async function confirmarPagoFactura(
  idfactura: number,
  idcliente: number,
  datos: ConfirmarPagoInput = {}
): Promise<{ success: boolean; error?: string; resuspendido?: boolean }> {
  try {
    const res = await mikrowispFetch<{ estado: string; mensaje?: string }>("/PaidInvoice", {
      idfactura,
      pasarela: "Intranet",
      ...(datos.cantidad != null ? { cantidad: datos.cantidad } : {}),
      ...(datos.comision != null ? { comision: datos.comision } : {}),
      ...(datos.idtransaccion ? { idtransaccion: datos.idtransaccion } : {}),
      ...(datos.fechalimite ? { fechalimite: datos.fechalimite } : {}),
      ...(datos.nota ? { nota: datos.nota } : {}),
    });

    if (res.estado !== "exito") {
      return { success: false, error: res.mensaje || "Mikrowisp rechazó el pago" };
    }

    // Mikrowisp reactiva al cliente automáticamente al pagar una factura,
    // sin importar si quedan otras vencidas. Si quedan, lo volvemos a suspender.
    let resuspendido = false;
    try {
      const restantes = await obtenerFacturasVencidas(idcliente);
      if (restantes.length > 0) {
        await mikrowispFetch("/SuspendService", { idcliente });
        resuspendido = true;
      }
    } catch (error) {
      console.error("Error al re-suspender cliente:", error instanceof Error ? error.message : error);
    }

    return { success: true, resuspendido };
  } catch (error) {
    console.error("Error al confirmar pago:", error instanceof Error ? error.message : error);
    return { success: false, error: "No se pudo conectar con Mikrowisp." };
  }
}

export async function registrarPromesaPago(
  idfactura: number,
  dias: number,
  descripcion?: string
): Promise<{ success: boolean; error?: string }> {
  if (dias < 1 || dias > 6) return { success: false, error: "Días fuera de rango (1-6)" };

  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const fechalimite = fecha.toISOString().slice(0, 10);

  try {
    const res = await mikrowispFetch<{ estado: string; mensaje?: string }>("/PromesaPago", {
      idfactura,
      fechalimite,
      ...(descripcion ? { descripcion } : {}),
    });

    if (res.estado !== "exito") {
      return { success: false, error: res.mensaje || "Mikrowisp rechazó la promesa de pago" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error al registrar promesa de pago:", error instanceof Error ? error.message : error);
    return { success: false, error: "No se pudo conectar con Mikrowisp." };
  }
}
