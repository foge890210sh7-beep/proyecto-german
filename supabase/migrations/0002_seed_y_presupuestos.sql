-- Seed inicial con los datos de German + tabla de presupuestos
-- Ejecutar en SQL Editor de Supabase DESPUES de 0001_init.sql

-- ============================================================
-- TABLA: presupuestos (semanales)
-- ============================================================
create table if not exists presupuestos (
  id uuid primary key default uuid_generate_v4(),
  semana_inicio date not null,  -- lunes de la semana
  monto numeric not null,
  notas text,
  created_at timestamptz not null default now(),
  unique (semana_inicio)
);

create index if not exists presupuestos_semana_idx on presupuestos(semana_inicio desc);

alter table presupuestos enable row level security;
drop policy if exists auth_all_presupuestos on presupuestos;
create policy auth_all_presupuestos on presupuestos
  for all to authenticated using (true) with check (true);

-- ============================================================
-- SEED: Conceptos del cuaderno de Queretaro - San Luis
-- ============================================================
-- DUDAS marcadas como NOTA: en notas
insert into conceptos (codigo, descripcion, unidad, precio_base, activo) values
  ('DEF-3C',   'Defensa de Tres Crestas',                    'm',   1100, true),
  ('POSTE-3',  'Poste para Defensa de Tres',                 'pza',  920, true),
  ('MEN',      'Ménsula',                                    'pza',  190, true),  -- DUDA: confirmar precio
  ('FAN-CON',  'Fantasma de Concreto',                       'pza',  900, true),
  ('TER-PAT',  'Terminal Calada Pato',                       'pza',  200, true),
  ('BAL',      'Baliados / Pintura',                         'm2',   100, true),
  ('LAV-BOC',  'Lavado de Bocas de Aceite',                  'pza',  130, true),  -- DUDA: confirmar nombre
  ('M3-CON',   'Metro Cúbico de Concreto',                   'm3',  1800, true),  -- DUDA: confirmar (1800 vs 8000)
  ('CHEB',     'Chebron',                                    'pza',  900, true),
  ('NIV-3C',   'Nivelación de Defensa de Tres Crestas',      'm',   1100, true),
  ('SEP-DEF',  'Separador de Defensa',                       'pza',   50, true),
  ('M3-MAM',   'Metro Cúbico de Mampostería',                'm3',  6800, true),
  ('BAC-ASF',  'Bacheo en Carpeta Asfáltica',                'm2',   100, true),
  ('TER-IMP',  'Terminal de Impacto (incluye todo)',         'pza', 15000, true),
  ('BAND-DIA', 'Banderazo por Día',                          'dia',  700, true),
  ('TIR-REF',  'Tirante de Refuerzo',                        'pza',  100, true)
on conflict (codigo) do nothing;

-- ============================================================
-- SEED: Clientes / Tramos
-- ============================================================
do $$
declare
  c1 uuid; c2 uuid; c3 uuid;
begin
  -- Cliente 1: Queretaro - San Luis
  insert into clientes (nombre, contacto)
    values ('Querétaro – San Luis', 'Tramo carretero')
    returning id into c1;

  -- Cliente 2: Queretaro - Palmillas
  insert into clientes (nombre, contacto)
    values ('Querétaro – Palmillas', 'Tramo carretero')
    returning id into c2;

  -- Cliente 3: Arco Norte
  insert into clientes (nombre, contacto)
    values ('Arco Norte', 'Tramo carretero')
    returning id into c3;

  -- Tramos (uno por cliente)
  insert into tramos (cliente_id, nombre) values
    (c1, 'Querétaro – San Luis'),
    (c2, 'Querétaro – Palmillas'),
    (c3, 'Arco Norte');
exception when unique_violation then
  -- Si ya existen, no hace nada
  null;
end $$;
