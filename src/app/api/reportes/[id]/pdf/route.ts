import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { fmtMXN, fmtFecha } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [r, items, gastos] = await Promise.all([
    supabase
      .from("reportes")
      .select("*, clientes(nombre, rfc, contacto), tramos(nombre, km_inicio, km_fin)")
      .eq("id", id)
      .single(),
    supabase.from("reporte_items").select("*").eq("reporte_id", id),
    supabase.from("gastos").select("*").eq("reporte_id", id),
  ]);
  if (r.error || !r.data) return new NextResponse("No encontrado", { status: 404 });
  const rep: any = r.data;

  const buffers: Buffer[] = [];
  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  doc.on("data", (b) => buffers.push(b));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(buffers))));

  // Header
  doc.fontSize(18).fillColor("#b45309").text("Reporte de trabajo", { align: "left" });
  doc.fontSize(10).fillColor("#475569").text(`Germán | Reparación de autopistas`);
  doc.moveDown();

  // Datos generales
  doc.fillColor("#0f172a").fontSize(11);
  doc.text(`Fecha: ${fmtFecha(rep.fecha)}`);
  doc.text(`Cliente: ${rep.clientes?.nombre ?? "—"}${rep.clientes?.rfc ? "  RFC: " + rep.clientes.rfc : ""}`);
  doc.text(`Tramo: ${rep.tramos?.nombre ?? "—"}${
    rep.tramos?.km_inicio != null ? `  (km ${rep.tramos.km_inicio} – ${rep.tramos.km_fin ?? "?"})` : ""
  }`);
  if (rep.notas) doc.text(`Notas: ${rep.notas}`);
  doc.moveDown();

  // Tabla
  const cols = [
    { x: 48, w: 220, label: "Concepto" },
    { x: 268, w: 50, label: "Unidad" },
    { x: 318, w: 60, label: "Cantidad", align: "right" as const },
    { x: 378, w: 80, label: "P. unit", align: "right" as const },
    { x: 458, w: 100, label: "Importe", align: "right" as const },
  ];

  doc.fontSize(10).fillColor("#475569");
  cols.forEach((c) => doc.text(c.label, c.x, doc.y, { width: c.w, align: (c as any).align ?? "left", continued: c !== cols[cols.length - 1] }));
  doc.moveDown(0.3);
  doc.moveTo(48, doc.y).lineTo(560, doc.y).strokeColor("#cbd5e1").stroke();
  doc.moveDown(0.3);

  doc.fillColor("#0f172a");
  (items.data ?? []).forEach((it: any) => {
    const y = doc.y;
    doc.text(it.descripcion, cols[0].x, y, { width: cols[0].w });
    doc.text(it.unidad, cols[1].x, y, { width: cols[1].w });
    doc.text(String(Number(it.cantidad)), cols[2].x, y, { width: cols[2].w, align: "right" });
    doc.text(fmtMXN(it.precio_unitario), cols[3].x, y, { width: cols[3].w, align: "right" });
    doc.text(fmtMXN(it.importe), cols[4].x, y, { width: cols[4].w, align: "right" });
    doc.moveDown(0.5);
  });

  doc.moveDown(0.5);
  doc.moveTo(48, doc.y).lineTo(560, doc.y).strokeColor("#cbd5e1").stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#0f172a").text("Total a cobrar:", 378, doc.y, { width: 80, align: "right", continued: true });
  doc.fillColor("#047857").text("  " + fmtMXN(rep.total), { align: "right" });

  // Gastos
  if ((gastos.data?.length ?? 0) > 0) {
    doc.moveDown(2);
    doc.fontSize(13).fillColor("#0f172a").text("Gastos asociados");
    doc.moveDown(0.4);
    let totalGastos = 0;
    (gastos.data ?? []).forEach((g: any) => {
      totalGastos += Number(g.monto);
      doc.fontSize(10).fillColor("#0f172a").text(
        `• [${g.categoria}] ${g.descripcion}${g.proveedor ? " — " + g.proveedor : ""}`,
        { continued: true },
      );
      doc.fillColor("#dc2626").text("  " + fmtMXN(g.monto), { align: "right" });
    });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#475569").text("Total gastos: " + fmtMXN(totalGastos), { align: "right" });
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).fillColor("#94a3b8").text("Documento generado automáticamente.", { align: "center" });

  doc.end();
  const pdf = await done;

  return new NextResponse(pdf as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reporte-${rep.fecha}.pdf"`,
    },
  });
}
