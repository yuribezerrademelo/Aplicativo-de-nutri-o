/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularIdade, calcularMeta, calcularTmb, type DadosMetabolicos } from './metabolismo.ts';

const base: DadosMetabolicos = {
  sexo: 'masculino',
  idade: 30,
  alturaCm: 175,
  pesoKg: 80,
  nivelAtividade: 'moderado',
  objetivo: 'manter',
};

test('idade considera se o aniversário já passou no ano', () => {
  const hoje = new Date(2026, 9, 15); // 15/10/2026
  assert.equal(calcularIdade(new Date(1995, 9, 15), hoje), 31); // faz aniversário hoje
  assert.equal(calcularIdade(new Date(1995, 9, 16), hoje), 30); // amanhã
  assert.equal(calcularIdade(new Date(1995, 0, 1), hoje), 31);
});

test('Mifflin-St Jeor para homem e mulher', () => {
  // 10*80 + 6.25*175 - 5*30 + 5 = 1748.75
  assert.deepEqual(calcularTmb(base), { valor: 1749, metodo: 'mifflin' });
  // 10*60 + 6.25*165 - 5*28 - 161 = 1330.25
  const mulher = { ...base, sexo: 'feminino' as const, pesoKg: 60, alturaCm: 165, idade: 28 };
  assert.deepEqual(calcularTmb(mulher), { valor: 1330, metodo: 'mifflin' });
});

test('% de gordura usa Katch-McArdle', () => {
  // massa magra = 80 * 0.8 = 64; 370 + 21.6*64 = 1752.4
  assert.deepEqual(calcularTmb({ ...base, percentualGordura: 20 }), { valor: 1752, metodo: 'katch_mcardle' });
});

test('TMB da avaliação física tem prioridade sobre tudo', () => {
  const r = calcularTmb({ ...base, percentualGordura: 20, tmbMedida: 1850 });
  assert.deepEqual(r, { valor: 1850, metodo: 'avaliacao' });
});

test('manutenção: meta = gasto total arredondado à dezena', () => {
  const r = calcularMeta(base);
  assert.equal(r.gastoTotal, 2711); // 1749 * 1.55 = 2710.95
  assert.equal(r.ajuste, 0);
  assert.equal(r.metaCalculada, 2710);
  assert.equal(r.limitadaPelaTmb, false);
});

test('perder peso aplica o déficit do ritmo', () => {
  const r = calcularMeta({ ...base, objetivo: 'perder', ritmo: 'moderado' });
  assert.equal(r.ajuste, -0.15);
  assert.equal(r.metaCalculada, 2300); // 2711 * 0.85 = 2304.35
});

test('ganhar peso aplica o superávit do ritmo', () => {
  const r = calcularMeta({ ...base, objetivo: 'ganhar', ritmo: 'leve' });
  assert.equal(r.metaCalculada, 2850); // 2711 * 1.05 = 2846.55
});

test('trava: déficit nunca deixa a meta abaixo da TMB', () => {
  // sedentário: gasto 1749*1.2 = 2099; -20% = 1679 < TMB 1749
  const r = calcularMeta({ ...base, nivelAtividade: 'sedentario', objetivo: 'perder', ritmo: 'acelerado' });
  assert.equal(r.limitadaPelaTmb, true);
  assert.equal(r.metaCalculada, 1750);
  assert.ok(r.metaCalculada >= r.tmb);
});
