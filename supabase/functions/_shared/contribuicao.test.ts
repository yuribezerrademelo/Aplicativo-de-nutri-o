/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { codigoContribuinte, selecionarContribuicoes } from './contribuicao.ts';
import type { ItemEstimado } from './estimativa.ts';

const item = (nome: string, gramas: number, porcao: string, kcal = 200, preparo = 'grelhado'): ItemEstimado => ({
  nome,
  porcao,
  gramas,
  preparo,
  kcal_min: kcal * 0.9,
  kcal_provavel: kcal,
  kcal_max: kcal * 1.1,
  proteina_g: 0,
  carboidrato_g: 0,
  gordura_g: 0,
  fibra_g: 0,
  confianca: 'alta',
});

test('só entram itens com peso informado e diferente da estimativa', () => {
  const original = { itens: [item('Peito de Frango', 280, '1 filé'), item('Batata', 141, '1 porção')] };
  const confirmados = [
    item('Peito de Frango', 170, '170 g', 270), // ajustado pelo usuário → entra
    item('Batata', 141, '141 g', 90), // igual à estimativa → não entra
    item('Arroz', 100, '4 colheres', 128), // sem peso informado → não entra
  ];
  const c = selecionarContribuicoes(original, confirmados, 'abc');
  assert.equal(c.length, 1);
  assert.deepEqual(c[0], {
    contribuinte: 'abc',
    alimento: 'peito de frango',
    preparo: 'grelhado',
    gramas_estimadas: 280,
    gramas_confirmadas: 170,
    kcal_por_100g: 158.8,
  });
});

test('código do contribuinte é estável, não revela o id e muda com o sal', async () => {
  const a = await codigoContribuinte('usuario-1', 'sal');
  assert.equal(a, await codigoContribuinte('usuario-1', 'sal'));
  assert.equal(a.length, 64);
  assert.ok(!a.includes('usuario'));
  assert.notEqual(a, await codigoContribuinte('usuario-1', 'outro-sal'));
});
