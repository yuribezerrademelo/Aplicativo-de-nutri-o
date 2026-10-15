/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gerarComentario, montarContexto, simularComentario, type DadosCoaching, type RefeicaoDoDia } from './coaching.ts';

const refeicao = (id: string, tipo: string, kcal: number, proteina: number): RefeicaoDoDia => ({
  id,
  tipo,
  consumida_em: '2026-10-15T15:00:00Z',
  kcal_min: kcal * 0.8,
  kcal_provavel: kcal,
  kcal_max: kcal * 1.2,
  proteina_g: proteina,
  carboidrato_g: 50,
  gordura_g: 15,
  fibra_g: 5,
  itens: [
    {
      nome: 'Frango',
      porcao: '1 filé',
      gramas: 170,
      preparo: 'selado',
      kcal_min: 270,
      kcal_provavel: 330,
      kcal_max: 420,
      proteina_g: 50,
      carboidrato_g: 0,
      gordura_g: 12,
      fibra_g: 0,
      confianca: 'media',
    },
  ],
});

const dados = (kcalAlmoco: number, hora = '13:00'): DadosCoaching => ({
  perfil: { nome: 'Yuri', objetivo: 'perder', meta_kcal: 1990, peso_kg: 70 },
  refeicoes: [refeicao('a', 'cafe_da_manha', 400, 20), refeicao('b', 'almoco', kcalAlmoco, 10)],
  refeicaoId: 'b',
  horaLocal: hora,
});

test('contexto: traz meta, refeição atual, dia e restante', () => {
  const c = montarContexto(dados(470));
  assert.match(c, /meta diária: 1990 kcal/);
  assert.match(c, /almoço\): 470 kcal/);
  assert.match(c, /Antes hoje: café da manhã 400 kcal/);
  assert.match(c, /Total do dia até agora: 870 kcal/);
  assert.match(c, /Faltam cerca de 1120 kcal/);
  assert.match(c, /112 g por dia/); // 70 kg × 1,6
});

test('simulado: passou da meta sem linguagem de culpa', () => {
  const texto = simularComentario(dados(1900));
  assert.match(texto, /passou cerca de 310 kcal/);
  assert.doesNotMatch(texto, /culpa|ruim|errad|exager|pecado/i);
});

test('simulado: sugere proteína quando a refeição teve pouca', () => {
  assert.match(simularComentario(dados(470)), /proteína/);
});

test('chamada: usa o texto da resposta e o modelo de coaching padrão', async () => {
  let corpo: Record<string, unknown> = {};
  const fetchFalso = (async (_u: string, init: RequestInit) => {
    corpo = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text: '  Boa escolha de almoço!  ' }], usage: { input_tokens: 300, output_tokens: 40 } }),
      { status: 200 },
    );
  }) as typeof fetch;
  const r = await gerarComentario(dados(470), { apiKey: 'k', fetch: fetchFalso });
  assert.equal(r.comentario, 'Boa escolha de almoço!');
  assert.equal(r.modelo, 'claude-haiku-5-5');
  assert.equal(corpo.model, 'claude-haiku-5-5');
});
