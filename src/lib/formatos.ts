/** Conversões entre o que o usuário digita (padrão brasileiro) e valores do app. */

/** "72,5" ou "72.5" → 72.5; vazio ou inválido → null. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** 2140 → "2.140"; 72.5 → "72,5". */
export function formatarNumero(n: number, casasDecimais = 0): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: casasDecimais,
  });
}

/** Número para mostrar dentro de um campo editável (sem separador de milhar). */
export function numeroParaCampo(n: number | null | undefined): string {
  return n == null ? '' : String(n).replace('.', ',');
}

/** Insere as barras enquanto o usuário digita: "15101995" → "15/10/1995". */
export function mascararData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "DD/MM/AAAA" → Date (horário local), ou null se a data não existir. */
export function lerDataBr(texto: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(ano, mes - 1, dia);
  const existe = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  return existe ? data : null;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Date → "AAAA-MM-DD" (formato do banco), sem deslocamento de fuso. */
export function dataParaIso(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** "AAAA-MM-DD" → Date local. */
export function isoParaData(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function isoParaDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** -0.15 → "−15%"; 0.1 → "+10%". */
export function formatarPercentual(fracao: number): string {
  const valor = Math.round(Math.abs(fracao) * 100);
  if (valor === 0) return '0%';
  return `${fracao < 0 ? '−' : '+'}${valor}%`;
}

/** Insere os dois-pontos enquanto o usuário digita: "1230" → "12:30". */
export function mascararHora(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** "HH:MM" → { horas, minutos }, ou null se inválido. */
export function lerHora(texto: string): { horas: number; minutos: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const [horas, minutos] = [Number(m[1]), Number(m[2])];
  return horas <= 23 && minutos <= 59 ? { horas, minutos } : null;
}

/** Date → "HH:MM" no fuso do aparelho. */
export function horaDe(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Início do dia (00:00 local) de uma data. */
export function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Junta o dia de `dia` com o horário "HH:MM" (fuso do aparelho). */
export function combinarDiaHora(dia: Date, hora: { horas: number; minutos: number }): Date {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora.horas, hora.minutos);
}

/** "Hoje", "Ontem" ou "qua., 14 de out.". */
export function rotuloDoDia(dia: Date, hoje = new Date()): string {
  const diferenca = Math.round((inicioDoDia(hoje).getTime() - inicioDoDia(dia).getTime()) / 86_400_000);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Ontem';
  return dia.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}
