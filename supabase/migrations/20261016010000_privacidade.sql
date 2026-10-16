-- Consentimento e base coletiva (pseudonimizada) de correções de porção.

alter table public.perfis add column contribuir_base_coletiva boolean not null default false;
alter table public.perfis add column consentimento_em timestamptz;

comment on column public.perfis.contribuir_base_coletiva is 'Usuário aceitou contribuir anonimamente com a base coletiva.';

-- Cada linha é uma porção confirmada pelo usuário (peso informado por ele).
-- Não guarda id, nome, e-mail, foto nem horário: só um código pseudônimo,
-- que permite contar pessoas distintas e apagar tudo se o consentimento for retirado.
create table public.contribuicoes (
  id bigint generated always as identity primary key,
  contribuinte text not null,
  alimento text not null,
  preparo text,
  gramas_estimadas numeric(7, 1),
  gramas_confirmadas numeric(7, 1) not null check (gramas_confirmadas > 0),
  kcal_por_100g numeric(6, 1),
  criado_em date not null default current_date
);

comment on table public.contribuicoes is 'Porções confirmadas, pseudonimizadas; acesso só pelo servidor.';
comment on column public.contribuicoes.contribuinte is 'SHA-256 do id do usuário com um sal secreto; nunca o id.';

create index contribuicoes_alimento on public.contribuicoes (alimento, preparo);
create index contribuicoes_contribuinte on public.contribuicoes (contribuinte);

-- Sem acesso pela API do app: só funções com a chave secreta leem e escrevem.
revoke all on public.contribuicoes from anon, authenticated;
alter table public.contribuicoes enable row level security;

-- Referências da comunidade: só alimentos confirmados por 5 pessoas diferentes ou mais.
create view public.referencias_coletivas
with (security_invoker = true)
as
select
  alimento,
  preparo,
  count(distinct contribuinte) as pessoas,
  percentile_cont(0.5) within group (order by gramas_confirmadas) as gramas_mediana,
  percentile_cont(0.5) within group (order by gramas_confirmadas / nullif(gramas_estimadas, 0)) as razao_mediana
from public.contribuicoes
group by alimento, preparo
having count(distinct contribuinte) >= 5;

revoke all on public.referencias_coletivas from anon, authenticated;
