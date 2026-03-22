import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cedula = req.nextUrl.searchParams.get("cedula");

  if (!cedula) {
    return NextResponse.json({ error: "Cédula requerida." }, { status: 400 });
  }

  try {
    const baseUrl =
      process.env.CONSULTA_API_URL ?? "https://cliente.protelecom.com.ve";

    const res = await fetch(
      `${baseUrl}/consulta/${encodeURIComponent(cedula)}?q=all`,
      { headers: { Accept: "application/json" } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `El servidor externo respondió con error ${res.status}.` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor externo." },
      { status: 502 }
    );
  }
}
