-- Registro de cada análise feita pela IA: serve para o limite diário por usuário,
-- para acompanhar custo (tokens) e para comparar versões do prompt.

create table public.analises (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  tipo text not null check (tipo in ('foto', 'texto', 'refinamento')),
  modelo text not null,
  versao_prompt text,
  tokens_entrada integer,
  tokens_saida integer,
  resultado jsonb
);

comment on table public.analises is 'Histórico de chamadas ao motor de análise (uso e custo).';

create index analises_usuario_criado_em on public.analises (usuario_id, criado_em desc);

-- Acesso pela API: o usuário logado só lê e cria (a edge function age em nome dele).
revoke all on public.analises from anon, authenticated;
grant select, insert on public.analises to authenticated;

alter table public.analises enable row level security;

create policy "dono lê as próprias análises"
on public.analises for select to authenticated
using ((select auth.uid()) = usuario_id);

create policy "dono registra as próprias análises"
on public.analises for insert to authenticated
with check ((select auth.uid()) = usuario_id);
