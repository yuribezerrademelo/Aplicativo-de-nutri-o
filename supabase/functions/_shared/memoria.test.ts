/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularTotais, type ItemEstimado } from './estimativa.ts';
import {
  aplicarMemoriaNoSimulado,
  aprenderComCorrecoes,
  descreverVies,
  montarContextoUsuario,
  resumirHistorico,
  type RefeicaoHistorico,
} from './memoria.ts';

const item = (nome: string, gramas: number, kcal: number, preparo = ''): ItemEstimado => ({
  nome,
  porcao: '',
  gramas,
  preparo,
  kcal_min: kcal * 0.8,
  kcal_provavel: kcal,
  kcal_max: kcal * 1.2,
  proteina_g: 10,
  carboidrato_g: 10,
  gordura_g: 5,
  fibra_g: 1,
  confianca: 'media',
});

test('aprender: porção corrigida em 25% ou mais vira fato; pequena variação não', () => {
  const original = { itens: [item('Peito de frango', 280, 445), item('Batata', 350, 315)] };
  const fatos = aprenderComCorrecoes(original, [item('Peito de frango', 170, 270), item('Batata', 330, 297)]);
  assert.equal(fatos.length, 1);
  assert.equal(fatos[0].chave, 'porcao:peito de frango');
  assert.match(fatos[0].texto, /170 g.*280 g/);
  assert.deepEqual(fatos[0].dados, { alimento: 'Peito de frango', gramas: 170 });
});

test('aprender: sem análise original não há o que comparar', () => {
  assert.deepEqual(aprenderComCorrecoes(null, [item('Arroz', 100, 128)]), []);
});

test('histórico: frequentes por mediana e viés da estimativa inicial', () => {
  const r = (kcalFinal: number, kcalOriginal: number, gramasFrango: number): RefeicaoHistorico => ({
    kcal_provavel: kcalFinal,
    itens: [item('Peito de frango', gramasFrango, kcalFinal, 'selado')],
    analise_original: { total: { kcal_provavel: kcalOriginal } },
  });
  const resumo = resumirHistorico([r(400, 500, 160), r(420, 520, 180), r(380, 480, 170)]);
  assert.deepEqual(resumo.frequentes[0], { nome: 'Peito de frango', vezes: 3, gramasMediana: 170, preparo: 'selado' });
  assert.equal(resumo.vies?.refeicoes, 3);
  assert.match(descreverVies(resumo.vies)!, /20% abaixo/);
});

test('viés pequeno (menos de 10%) não é mencionado', () => {
  assert.equal(descreverVies({ razao: 0.95, refeicoes: 5 }), null);
});

test('contexto: junta fatos, frequentes e viés; vazio quando não há nada', () => {
  assert.equal(montarContextoUsuario([], { frequentes: [], vies: null }), undefined);
  const c = montarContextoUsuario(
    [{ texto: 'Batata na airfryer é sempre sem óleo.', origem: 'manual', chave: null }],
    { frequentes: [{ nome: 'Batata', vezes: 4, gramasMediana: 140, preparo: 'airfryer' }], vies: { razao: 0.7, refeicoes: 4 } },
  )!;
  assert.match(c, /sempre sem óleo/);
  assert.match(c, /Batata: 4 vezes, ~140 g, geralmente airfryer/);
  assert.match(c, /30% abaixo/);
});

test('simulado: aplica a porção lembrada e avisa nas suposições', () => {
  const itens = [item('Peito de frango', 120, 190)];
  const resultado = { reconhecido: true, itens, suposicoes: [], perguntas: [], observacao: '', total: calcularTotais(itens) };
  const r = aplicarMemoriaNoSimulado(resultado, [
    { texto: '...', origem: 'automatica', chave: 'porcao:peito de frango', dados: { alimento: 'Peito de frango', gramas: 170 } },
  ]);
  assert.equal(r.itens[0].gramas, 170);
  assert.ok(r.total.kcal_provavel > resultado.total.kcal_provavel);
  assert.match(r.suposicoes.at(-1)!, /Peito de frango/);
});
