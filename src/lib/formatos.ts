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
