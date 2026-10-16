/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { combinarDiaHora, lerDataBr, lerHora, lerNumero, mascararData, mascararHora, rotuloDoDia } from './formatos.ts';

test('números no padrão brasileiro', () => {
  assert.equal(lerNumero('72,5'), 72.5);
  assert.equal(lerNumero(' 1.75 '), 1.75);
  assert.equal(lerNumero('abc'), null);
  assert.equal(lerNumero(''), null);
});

test('datas: máscara e validação de dias que não existem', () => {
  assert.equal(mascararData('15101995'), '15/10/1995');
  assert.ok(lerDataBr('29/02/2024'));
  assert.equal(lerDataBr('31/02/2024'), null);
});

test('horas: máscara e validação', () => {
  assert.equal(mascararHora('1230'), '12:30');
  assert.equal(mascararHora('9'), '9');
  assert.deepEqual(lerHora('07:05'), { horas: 7, minutos: 5 });
  assert.equal(lerHora('24:00'), null);
  assert.equal(lerHora('12:60'), null);
});

test('combinar dia e hora e rotular o dia', () => {
  const d = combinarDiaHora(new Date(2026, 9, 14, 22, 0), { horas: 12, minutos: 30 });
  assert.equal(d.getDate(), 14);
  assert.equal(d.getHours(), 12);
  const hoje = new Date(2026, 9, 16, 9, 0);
  assert.equal(rotuloDoDia(new Date(2026, 9, 16, 23, 0), hoje), 'Hoje');
  assert.equal(rotuloDoDia(new Date(2026, 9, 15, 1, 0), hoje), 'Ontem');
});
