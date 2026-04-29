import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [r, items, gastos] = await Promise.all([
    supabase
      .from("reportes")
      .select("*, clientes(nombre, rfc), tramos(nombre)")
      .eq("id", id)
      .single(),
    supabase.from("reporte_items").select("*").eq("reporte_id", id),
    supabase.from("gastos").select("*").eq("reporte_id", id),
  ]);
  if (r.error || !r.data) return new NextResponse("No encontrado", { status: 404 });
  const rep: any = r.data;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Administración Saladino";
  wb.created = new Date();

  // Hoja 1: Reporte
  const ws = wb.addWorksheet("Reporte");
  ws.columns = [
    { header: "", key: "a", width: 30 },
    { header: "", key: "b", width: 14 },
    { header: "", key: "c", width: 14 },
    { header: "", key: "d", width: 16 },
    { header: "", key: "e", width: 16 },
  ];

  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = "Reporte de trabajo — Administración Saladino";
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFB45309" } };

  ws.addRow([]);
  ws.addRow(["Fecha", rep.fecha]);
  ws.addRow(["Cliente", rep.clientes?.nombre ?? ""]);
  ws.addRow(["RFC", rep.clientes?.rfc ?? ""]);
  ws.addRow(["Tramo", rep.tramos?.nombre ?? ""]);
  if (rep.notas) ws.addRow(["Notas", rep.notas]);
  ws.addRow([]);

  const headerRow = ws.addRow(["Concepto", "Unidad", "Cantidad", "Precio unit.", "Importe"]);
  headerRow.font = { bold: true };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center" };
  });

  (items.data ?? []).forEach((it: any) => {
    const row = ws.addRow([
      it.descripcion,
      it.unidad,
      Number(it.cantidad),
      Number(it.precio_unitario),
      Number(it.importe),
    ]);
    row.getCell(4).numFmt = '"$"#,##0.00';
    row.getCell(5).numFmt = '"$"#,##0.00';
  });

  ws.addRow([]);
  const totRow = ws.addRow(["", "", "", "Total", Number(rep.total)]);
  totRow.font = { bold: true };
  totRow.getCell(5).numFmt = '"$"#,##0.00';
  totRow.getCell(5).font = { bold: true, color: { argb: "FF047857" } };

  // Hoja 2: Gastos
  if ((gastos.data?.length ?? 0) > 0) {
    const wsg = wb.addWorksheet("Gastos");
    wsg.columns = [
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Categoría", key: "categoria", width: 16 },
      { header: "Descripción", key: "descripcion", width: 40 },
      { header: "Proveedor", key: "proveedor", width: 20 },
      { header: "Monto", key: "monto", width: 14 },
    ];
    wsg.getRow(1).font = { bold: true };
    let total = 0;
    (gastos.data ?? []).forEach((g: any) => {
      total += Number(g.monto);
      wsg.addRow({ ...g, monto: Number(g.monto) }).getCell(5).numFmt = '"$"#,##0.00';
    });
    wsg.addRow([]);
    const tr = wsg.addRow(["", "", "", "Total gastos", total]);
    tr.font = { bold: true };
    tr.getCell(5).numFmt = '"$"#,##0.00';
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as any, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${rep.fecha}.xlsx"`,
    },
  });
}
