-- Comentário de coaching gerado depois de cada refeição confirmada.
alter table public.refeicoes add column comentario text;

comment on column public.refeicoes.comentario is 'Comentário do coach sobre a refeição, no contexto do dia.';

-- O registro de uso passa a contar também os comentários de coaching.
alter table public.analises drop constraint analises_tipo_check;
alter table public.analises
  add constraint analises_tipo_check check (tipo in ('foto', 'texto', 'refinamento', 'coaching'));
