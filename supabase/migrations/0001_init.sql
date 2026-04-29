-- Plataforma administrativa de German - Reparacion de autopistas
-- Ejecutar en el SQL Editor de Supabase despues de crear el proyecto

create extension if not exists "uuid-ossp";

-- ============================================================
-- CLIENTES (las concesionarias / dependencias a las que factura)
-- ============================================================
create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  rfc text,
  contacto text,
  notas text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRAMOS CARRETEROS
-- ============================================================
create table if not exists tramos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete cascade,
  nombre text not null,
  km_inicio numeric,
  km_fin numeric,
  notas text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CATALOGO DE CONCEPTOS (lo que repara: postes, senalamientos, etc.)
-- ============================================================
create table if not exists conceptos (
  id uuid primary key default uuid_generate_v4(),
  codigo text unique,
  descripcion text not null,
  unidad text not null default 'pza',
  precio_base numeric not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRECIOS POR CLIENTE (sobreescribe precio_base)
-- ============================================================
create table if not exists precios_cliente (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  concepto_id uuid not null references conceptos(id) on delete cascade,
  precio numeric not null,
  unique (cliente_id, concepto_id)
);

-- ============================================================
-- REPORTES DIARIOS DE TRABAJO
-- ============================================================
create table if not exists reportes (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  cliente_id uuid references clientes(id),
  tramo_id uuid references tramos(id),
  notas text,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists reportes_fecha_idx on reportes(fecha desc);

-- ============================================================
-- PARTIDAS DE CADA REPORTE (cantidad x concepto)
-- ============================================================
create table if not exists reporte_items (
  id uuid primary key default uuid_generate_v4(),
  reporte_id uuid not null references reportes(id) on delete cascade,
  concepto_id uuid not null references conceptos(id),
  descripcion text not null,
  unidad text not null,
  cantidad numeric not null,
  precio_unitario numeric not null,
  importe numeric generated always as (cantidad * precio_unitario) stored
);

-- ============================================================
-- GASTOS DIARIOS
-- ============================================================
create table if not exists gastos (
  id uuid primary key default uuid_generate_v4(),
  fecha date not null default current_date,
  categoria text not null default 'general',
  descripcion text not null,
  monto numeric not null,
  proveedor text,
  reporte_id uuid references reportes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists gastos_fecha_idx on gastos(fecha desc);

-- ============================================================
-- FOTOS
-- ============================================================
create table if not exists fotos (
  id uuid primary key default uuid_generate_v4(),
  reporte_id uuid references reportes(id) on delete set null,
  tramo_id uuid references tramos(id) on delete set null,
  fecha date not null default current_date,
  etapa text not null check (etapa in ('antes','durante','despues')),
  descripcion text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists fotos_fecha_idx on fotos(fecha desc);

-- ============================================================
-- TRIGGER: recalcular total del reporte al cambiar partidas
-- ============================================================
create or replace function recalcular_total_reporte()
returns trigger language plpgsql as $$
declare
  rid uuid;
begin
  rid := coalesce(new.reporte_id, old.reporte_id);
  update reportes
    set total = coalesce((select sum(importe) from reporte_items where reporte_id = rid), 0)
    where id = rid;
  return null;
end $$;

drop trigger if exists trg_recalc_total on reporte_items;
create trigger trg_recalc_total
  after insert or update or delete on reporte_items
  for each row execute function recalcular_total_reporte();

-- ============================================================
-- ROW LEVEL SECURITY (un solo usuario - el que se loguea ve todo)
-- ============================================================
alter table clientes enable row level security;
alter table tramos enable row level security;
alter table conceptos enable row level security;
alter table precios_cliente enable row level security;
alter table reportes enable row level security;
alter table reporte_items enable row level security;
alter table gastos enable row level security;
alter table fotos enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['clientes','tramos','conceptos','precios_cliente','reportes','reporte_items','gastos','fotos']) loop
    execute format('drop policy if exists %I on %I', 'auth_all_' || t, t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', 'auth_all_' || t, t);
  end loop;
end $$;

-- ============================================================
-- STORAGE: bucket para fotos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists "fotos_auth_rw" on storage.objects;
create policy "fotos_auth_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos')
  with check (bucket_id = 'fotos');

drop policy if exists "fotos_public_read" on storage.objects;
create policy "fotos_public_read" on storage.objects
  for select to anon
  using (bucket_id = 'fotos');
