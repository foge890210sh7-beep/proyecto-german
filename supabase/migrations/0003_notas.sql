-- ============================================================
-- HOJA DE CUADERNO — notas libres estilo libreta
-- ============================================================
-- German pidio una hoja tipo libreta rayada para escribir a mano
-- notas de estimaciones, totales sumados aparte, apuntes de campo,
-- etc. Muy aparte de la nomina/reportes formales.
--
-- El contenido es texto libre. Se puede asociar a un tramo (opcional)
-- para filtrar despues, pero no es obligatorio.

create table if not exists notas (
  id uuid primary key default uuid_generate_v4(),
  titulo text,
  contenido text not null default '',
  tramo_id uuid references tramos(id) on delete set null,
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notas_fecha_idx on notas(fecha desc);
create index if not exists notas_tramo_idx on notas(tramo_id);

-- Trigger para mantener updated_at al dia
create or replace function bump_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists notas_updated_at on notas;
create trigger notas_updated_at
  before update on notas
  for each row execute function bump_updated_at();

-- RLS: mismo patron que las otras tablas (cualquier usuario autenticado)
alter table notas enable row level security;
drop policy if exists auth_all_notas on notas;
create policy auth_all_notas on notas
  for all to authenticated
  using (true) with check (true);
