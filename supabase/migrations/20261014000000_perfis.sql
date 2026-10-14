-- Perfil do usuário: dados basais, objetivo e meta calórica.
-- Uma linha por usuário, com o mesmo id da conta em auth.users.

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,

  -- Dados basais (usados no cálculo da TMB)
  sexo text check (sexo in ('masculino', 'feminino')),
  data_nascimento date,
  altura_cm numeric(5, 1) check (altura_cm between 100 and 250),
  peso_kg numeric(5, 1) check (peso_kg between 30 and 300),
  nivel_atividade text check (
    nivel_atividade in ('sedentario', 'leve', 'moderado', 'intenso', 'muito_intenso')
  ),

  -- Dados opcionais de avaliação física (têm prioridade no cálculo)
  tmb_medida_kcal numeric(6, 0) check (tmb_medida_kcal between 800 and 4000),
  percentual_gordura numeric(4, 1) check (percentual_gordura between 3 and 70),

  -- Objetivo e meta
  objetivo text check (objetivo in ('perder', 'manter', 'ganhar')),
  ritmo text check (ritmo in ('leve', 'moderado', 'acelerado')),
  meta_kcal numeric(6, 0) check (meta_kcal between 800 and 6000),
  meta_ajustada_manualmente boolean not null default false,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is 'Dados basais, objetivo e meta calórica de cada usuário.';
comment on column public.perfis.ritmo is 'Intensidade do déficit/superávit; nulo quando o objetivo é manter.';
comment on column public.perfis.meta_kcal is 'Meta diária efetiva: calculada pelo app ou ajustada pelo usuário.';

-- Mantém atualizado_em sempre correto
create function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger perfis_tocar_atualizado_em
before update on public.perfis
for each row execute function public.tocar_atualizado_em();

-- Segurança: cada usuário só enxerga e altera o próprio perfil
alter table public.perfis enable row level security;

create policy "dono lê o próprio perfil"
on public.perfis for select to authenticated
using ((select auth.uid()) = id);

create policy "dono cria o próprio perfil"
on public.perfis for insert to authenticated
with check ((select auth.uid()) = id);

create policy "dono edita o próprio perfil"
on public.perfis for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
