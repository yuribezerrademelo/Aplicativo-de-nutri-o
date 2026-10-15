/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ajustarGramas, type ItemEstimado } from './estimativa.ts';
import { simularAnalise } from './simulador.ts';

test('simulador: lê gramas e unidades do texto', async () => {
  const r = await simularAnalise({ texto: '150 g de arroz branco, feijão e 2 ovos' }, 0);
  assert.equal(r.simulado, true);
  const nomes = r.itens.map((i) => i.nome);
  assert.deepEqual(nomes, ['Arroz branco', 'Feijão carioca', 'Ovo']);
  assert.equal(r.itens[0].gramas, 150);
  assert.equal(r.itens[0].confianca, 'alta');
  assert.equal(r.itens[2].gramas, 100);
  assert.ok(r.perguntas.length > 0);
});

test('simulador: foto sem texto devolve prato de exemplo', async () => {
  const r = await simularAnalise({ imagem: { base64: 'x', tipo: 'image/jpeg' } }, 0);
  assert.equal(r.itens.length, 4);
  assert.ok(r.total.kcal_min < r.total.kcal_provavel && r.total.kcal_provavel < r.total.kcal_max);
});

test('simulador: "foi frito" aumenta as calorias da proteína e encerra as perguntas', async () => {
  const antes = await simularAnalise({ texto: 'arroz e frango' }, 0);
  const depois = await simularAnalise({ texto: 'arroz e frango', anterior: antes, correcao: 'o frango foi frito' }, 0);
  const frango = (r: typeof antes) => r.itens.find((i) => i.nome === 'Peito de frango')!;
  assert.ok(frango(depois).kcal_provavel > frango(antes).kcal_provavel);
  assert.equal(frango(depois).preparo, 'frito');
  assert.equal(depois.perguntas.length, 0);
  assert.ok(depois.total.kcal_provavel > antes.total.kcal_provavel);
});

test('ajustarGramas: escala proporcionalmente e estreita a faixa', () => {
  const item: ItemEstimado = {
    nome: 'Arroz',
    porcao: '4 colheres',
    gramas: 100,
    preparo: 'cozido',
    kcal_min: 96,
    kcal_provavel: 128,
    kcal_max: 160,
    proteina_g: 2.5,
    carboidrato_g: 28,
    gordura_g: 0.2,
    fibra_g: 1.6,
    confianca: 'media',
  };
  const a = ajustarGramas(item, 200);
  assert.equal(a.kcal_provavel, 256);
  assert.equal(a.carboidrato_g, 56);
  assert.equal(a.confianca, 'alta');
  // faixa original ±25% → limitada a ±15%
  assert.equal(a.kcal_min, Math.round(256 * 0.85));
  assert.equal(a.kcal_max, Math.round(256 * 1.15));
  assert.equal(a.porcao, '200 g');
});
