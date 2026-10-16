-- Memória do usuário: o app aprende com as correções e usa isso nas próximas análises.

-- Estimativa inicial da IA (antes de ajustes e especificações), para comparar com o confirmado.
alter table public.refeicoes add column analise_original jsonb;
comment on column public.refeicoes.analise_original is 'Primeira estimativa da IA, antes das correções do usuário.';

create table public.memorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto text not null check (char_length(texto) between 3 and 300),
  origem text not null default 'manual' check (origem in ('automatica', 'manual')),
  -- Identifica fatos automáticos sobre o mesmo assunto, para atualizar em vez de duplicar
  -- (ex.: "porcao:peito de frango"). Nulo nos fatos escritos pelo usuário.
  chave text,
  -- Dados estruturados do fato, quando houver (ex.: {"alimento": "Peito de frango", "gramas": 170}).
  dados jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, chave)
);

comment on table public.memorias is 'Fatos sobre os hábitos do usuário, usados como contexto nas análises.';

create index memorias_usuario on public.memorias (usuario_id, atualizado_em desc);

create trigger memorias_tocar_atualizado_em
before update on public.memorias
for each row execute function public.tocar_atualizado_em();

revoke all on public.memorias from anon, authenticated;
grant select, insert, update, delete on public.memorias to authenticated;

alter table public.memorias enable row level security;

create policy "dono lê a própria memória"
on public.memorias for select to authenticated
using ((select auth.uid()) = usuario_id);

create policy "dono cria fatos na própria memória"
on public.memorias for insert to authenticated
with check ((select auth.uid()) = usuario_id);

create policy "dono edita a própria memória"
on public.memorias for update to authenticated
using ((select auth.uid()) = usuario_id)
with check ((select auth.uid()) = usuario_id);

create policy "dono apaga fatos da própria memória"
on public.memorias for delete to authenticated
using ((select auth.uid()) = usuario_id);
