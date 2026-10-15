-- Refeições confirmadas pelo usuário: cada uma abate da meta do dia.
-- Os itens ficam em jsonb (lista de ItemEstimado); os totais ficam em colunas
-- para somar o dia sem abrir o jsonb.

create table public.refeicoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('cafe_da_manha', 'almoco', 'lanche', 'jantar', 'ceia', 'outro')),
  consumida_em timestamptz not null default now(),
  origem text not null check (origem in ('foto', 'texto')),
  descricao text,

  kcal_min integer not null check (kcal_min >= 0),
  kcal_provavel integer not null check (kcal_provavel >= kcal_min),
  kcal_max integer not null check (kcal_max >= kcal_provavel),
  proteina_g numeric(6, 1) not null default 0,
  carboidrato_g numeric(6, 1) not null default 0,
  gordura_g numeric(6, 1) not null default 0,
  fibra_g numeric(6, 1) not null default 0,

  itens jsonb not null,
  analise jsonb,
  simulada boolean not null default false,

  criado_em timestamptz not null default now()
);

comment on table public.refeicoes is 'Refeições confirmadas, com estimativa em faixa e itens.';
comment on column public.refeicoes.analise is 'Resultado completo da análise (suposições, observação), para referência.';
comment on column public.refeicoes.simulada is 'Verdadeiro quando a estimativa veio do modo simulado (sem IA).';

create index refeicoes_usuario_consumida_em on public.refeicoes (usuario_id, consumida_em desc);

revoke all on public.refeicoes from anon, authenticated;
grant select, insert, update, delete on public.refeicoes to authenticated;

alter table public.refeicoes enable row level security;

create policy "dono lê as próprias refeições"
on public.refeicoes for select to authenticated
using ((select auth.uid()) = usuario_id);

create policy "dono registra as próprias refeições"
on public.refeicoes for insert to authenticated
with check ((select auth.uid()) = usuario_id);

create policy "dono edita as próprias refeições"
on public.refeicoes for update to authenticated
using ((select auth.uid()) = usuario_id)
with check ((select auth.uid()) = usuario_id);

create policy "dono apaga as próprias refeições"
on public.refeicoes for delete to authenticated
using ((select auth.uid()) = usuario_id);
