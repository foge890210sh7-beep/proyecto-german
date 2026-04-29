export type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
  contacto: string | null;
  notas: string | null;
  created_at: string;
};

export type Tramo = {
  id: string;
  cliente_id: string | null;
  nombre: string;
  km_inicio: number | null;
  km_fin: number | null;
  notas: string | null;
};

export type Concepto = {
  id: string;
  codigo: string | null;
  descripcion: string;
  unidad: string;
  precio_base: number;
  activo: boolean;
};

export type PrecioCliente = {
  id: string;
  cliente_id: string;
  concepto_id: string;
  precio: number;
};

export type Reporte = {
  id: string;
  fecha: string;
  cliente_id: string | null;
  tramo_id: string | null;
  notas: string | null;
  total: number;
  created_at: string;
};

export type ReporteItem = {
  id: string;
  reporte_id: string;
  concepto_id: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
};

export type Gasto = {
  id: string;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  proveedor: string | null;
  reporte_id: string | null;
};

export type Etapa = "antes" | "durante" | "despues";

export type Foto = {
  id: string;
  reporte_id: string | null;
  tramo_id: string | null;
  fecha: string;
  etapa: Etapa;
  descripcion: string | null;
  storage_path: string;
  created_at: string;
};
