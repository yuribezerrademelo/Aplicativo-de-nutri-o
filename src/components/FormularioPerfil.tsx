import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Opcao } from '@/components/Opcao';
import { ResumoMeta } from '@/components/ResumoMeta';
import {
  dataParaIso,
  formatarNumero,
  isoParaDataBr,
  lerDataBr,
  lerNumero,
  mascararData,
  numeroParaCampo,
} from '@/lib/formatos';
import {
  calcularIdade,
  calcularMeta,
  IDADE_MAXIMA,
  IDADE_MINIMA,
  type NivelAtividade,
  type Objetivo,
  type Ritmo,
  type Sexo,
} from '@/lib/metabolismo';
import {
  OPCOES_ATIVIDADE,
  OPCOES_OBJETIVO,
  OPCOES_RITMO,
  OPCOES_SEXO,
  type DadosPerfil,
  type Perfil,
} from '@/lib/perfil';
import { cores, espaco, fonte, raio } from '@/theme';

type Props = {
  inicial?: Perfil | null;
  onSalvar: (dados: DadosPerfil) => Promise<string | null>;
  /** Quando presente (modo edição), "Voltar" no primeiro passo cancela. */
  onCancelar?: () => void;
};

const PASSOS = [
  {
    titulo: 'Vamos te conhecer',
    subtitulo: 'Esses dados servem para estimar quanto seu corpo gasta por dia.',
  },
  {
    titulo: 'Como é sua rotina?',
    subtitulo: 'Pense na média da semana, somando trabalho e treinos.',
  },
  {
    titulo: 'Tem uma avaliação física?',
    subtitulo:
      'Se você já fez bioimpedância ou avaliação com um profissional, esses números deixam o cálculo mais preciso. Se não tiver, é só pular.',
  },
  {
    titulo: 'Qual é o seu objetivo?',
    subtitulo: 'Dá para mudar quando quiser.',
  },
  {
    titulo: 'Sua meta diária',
    subtitulo: 'Calculada a partir dos seus dados. Você pode ajustar se preferir outro número.',
  },
];

const ULTIMO_PASSO = PASSOS.length - 1;

/** Altura aceita "175" (cm) ou "1,75" (metros). */
function lerAltura(texto: string): number | null {
  const n = lerNumero(texto);
  if (n == null) return null;
  return n < 3 ? Math.round(n * 1000) / 10 : n;
}

export function FormularioPerfil({ inicial, onSalvar, onCancelar }: Props) {
  const [passo, setPasso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [sexo, setSexo] = useState<Sexo | null>(inicial?.sexo ?? null);
  const [nascimento, setNascimento] = useState(inicial?.data_nascimento ? isoParaDataBr(inicial.data_nascimento) : '');
  const [altura, setAltura] = useState(numeroParaCampo(inicial?.altura_cm));
  const [peso, setPeso] = useState(numeroParaCampo(inicial?.peso_kg));
  const [atividade, setAtividade] = useState<NivelAtividade | null>(inicial?.nivel_atividade ?? null);
  const [tmbMedida, setTmbMedida] = useState(numeroParaCampo(inicial?.tmb_medida_kcal));
  const [gordura, setGordura] = useState(numeroParaCampo(inicial?.percentual_gordura));
  const [objetivo, setObjetivo] = useState<Objetivo | null>(inicial?.objetivo ?? null);
  const [ritmo, setRitmo] = useState<Ritmo | null>(inicial?.ritmo ?? null);
  // null = usar a meta calculada; texto = o usuário digitou a própria meta.
  const [metaManual, setMetaManual] = useState<string | null>(
    inicial?.meta_ajustada_manualmente && inicial.meta_kcal ? String(inicial.meta_kcal) : null,
  );

  const dataNascimento = lerDataBr(nascimento);
  const idade = dataNascimento ? calcularIdade(dataNascimento) : null;

  const calculo = useMemo(() => {
    const alturaCm = lerAltura(altura);
    const pesoKg = lerNumero(peso);
    if (!sexo || idade == null || !alturaCm || !pesoKg || !atividade || !objetivo) return null;
    return calcularMeta({
      sexo,
      idade,
      alturaCm,
      pesoKg,
      nivelAtividade: atividade,
      objetivo,
      ritmo,
      tmbMedida: lerNumero(tmbMedida),
      percentualGordura: lerNumero(gordura),
    });
  }, [sexo, idade, altura, peso, atividade, objetivo, ritmo, tmbMedida, gordura]);

  const metaEfetiva = metaManual != null ? lerNumero(metaManual) : (calculo?.metaCalculada ?? null);

  function validar(p: number): string | null {
    if (p === 0) {
      if (!sexo) return 'Escolha o sexo biológico.';
      if (!dataNascimento) return 'Informe a data de nascimento no formato DD/MM/AAAA.';
      if (idade! < IDADE_MINIMA) return 'Por enquanto o app é pensado para adultos (18 anos ou mais).';
      if (idade! > IDADE_MAXIMA) return 'Confira a data de nascimento.';
      const a = lerAltura(altura);
      if (a == null || a < 100 || a > 250) return 'Informe a altura em centímetros (entre 100 e 250).';
      const kg = lerNumero(peso);
      if (kg == null || kg < 30 || kg > 300) return 'Informe o peso em kg (entre 30 e 300).';
    }
    if (p === 1 && !atividade) return 'Escolha o nível que mais se parece com sua rotina.';
    if (p === 2) {
      const t = lerNumero(tmbMedida);
      if (tmbMedida.trim() && (t == null || t < 800 || t > 4000))
        return 'A TMB costuma ficar entre 800 e 4.000 kcal. Confira o valor ou deixe em branco.';
      const g = lerNumero(gordura);
      if (gordura.trim() && (g == null || g < 3 || g > 70))
        return 'O % de gordura deve ficar entre 3 e 70. Confira o valor ou deixe em branco.';
    }
    if (p === 3) {
      if (!objetivo) return 'Escolha um objetivo.';
      if (objetivo !== 'manter' && !ritmo) return 'Escolha o ritmo.';
    }
    if (p === 4 && (metaEfetiva == null || metaEfetiva < 800 || metaEfetiva > 6000))
      return 'A meta deve ficar entre 800 e 6.000 kcal.';
    return null;
  }

  function escolherObjetivo(o: Objetivo) {
    setObjetivo(o);
    if (o === 'manter') setRitmo(null);
    else if (!ritmo) setRitmo('moderado');
  }

  function voltar() {
    setErro(null);
    if (passo === 0) onCancelar?.();
    else setPasso(passo - 1);
  }

  async function avancar() {
    const problema = validar(passo);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    if (passo < ULTIMO_PASSO) {
      setPasso(passo + 1);
      return;
    }

    setSalvando(true);
    const meta = Math.round(metaEfetiva!);
    const falha = await onSalvar({
      nome: nome.trim() || null,
      sexo,
      data_nascimento: dataParaIso(dataNascimento!),
      altura_cm: Math.round(lerAltura(altura)! * 10) / 10,
      peso_kg: Math.round(lerNumero(peso)! * 10) / 10,
      nivel_atividade: atividade,
      tmb_medida_kcal: tmbMedida.trim() ? Math.round(lerNumero(tmbMedida)!) : null,
      percentual_gordura: gordura.trim() ? Math.round(lerNumero(gordura)! * 10) / 10 : null,
      objetivo,
      ritmo: objetivo === 'manter' ? null : ritmo,
      meta_kcal: meta,
      meta_ajustada_manualmente: meta !== calculo?.metaCalculada,
    });
    setSalvando(false);
    if (falha) setErro(falha);
  }

  const pularAvaliacao = passo === 2 && !tmbMedida.trim() && !gordura.trim();
  const rotuloAvancar = passo === ULTIMO_PASSO ? 'Salvar' : pularAvaliacao ? 'Pular' : 'Continuar';
  const mostrarVoltar = passo > 0 || !!onCancelar;

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.progresso}>
          <Text style={styles.passoTexto}>
            Passo {passo + 1} de {PASSOS.length}
          </Text>
          <View style={styles.trilha}>
            {PASSOS.map((_, i) => (
              <View key={i} style={[styles.segmento, i <= passo && styles.segmentoAtivo]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>{PASSOS[passo].titulo}</Text>
            <Text style={styles.subtitulo}>{PASSOS[passo].subtitulo}</Text>
          </View>

          {passo === 0 && (
            <View style={styles.grupo}>
              <CampoTexto rotulo="Como quer ser chamado? (opcional)" value={nome} onChangeText={setNome} placeholder="Seu nome" autoCapitalize="words" />
              <View style={styles.grupoPequeno}>
                <Text style={styles.rotulo}>Sexo biológico</Text>
                <View style={styles.linha}>
                  {OPCOES_SEXO.map((o) => (
                    <View key={o.valor} style={{ flex: 1 }}>
                      <Opcao titulo={o.titulo} selecionado={sexo === o.valor} onPress={() => setSexo(o.valor)} />
                    </View>
                  ))}
                </View>
                <Text style={styles.ajuda}>Usado apenas no cálculo do gasto basal.</Text>
              </View>
              <CampoTexto
                rotulo="Data de nascimento"
                value={nascimento}
                onChangeText={(t) => setNascimento(mascararData(t))}
                placeholder="DD/MM/AAAA"
                keyboardType="number-pad"
                maxLength={10}
              />
              <View style={styles.linha}>
                <View style={{ flex: 1 }}>
                  <CampoTexto rotulo="Altura" value={altura} onChangeText={setAltura} placeholder="175" keyboardType="decimal-pad" sufixo="cm" />
                </View>
                <View style={{ flex: 1 }}>
                  <CampoTexto rotulo="Peso" value={peso} onChangeText={setPeso} placeholder="72,5" keyboardType="decimal-pad" sufixo="kg" />
                </View>
              </View>
            </View>
          )}

          {passo === 1 && (
            <View style={styles.grupoPequeno} accessibilityRole="radiogroup">
              {OPCOES_ATIVIDADE.map((o) => (
                <Opcao key={o.valor} titulo={o.titulo} descricao={o.descricao} selecionado={atividade === o.valor} onPress={() => setAtividade(o.valor)} />
              ))}
            </View>
          )}

          {passo === 2 && (
            <View style={styles.grupo}>
              <CampoTexto
                rotulo="Taxa metabólica basal (TMB)"
                value={tmbMedida}
                onChangeText={setTmbMedida}
                placeholder="Ex.: 1.650"
                keyboardType="number-pad"
                sufixo="kcal"
                ajuda="Aparece como TMB, BMR ou metabolismo basal no laudo."
              />
              <CampoTexto
                rotulo="Percentual de gordura"
                value={gordura}
                onChangeText={setGordura}
                placeholder="Ex.: 22"
                keyboardType="decimal-pad"
                sufixo="%"
                ajuda="Se informar só este, usamos a fórmula de Katch-McArdle, que considera sua massa magra."
              />
            </View>
          )}

          {passo === 3 && (
            <View style={styles.grupo}>
              <View style={styles.grupoPequeno} accessibilityRole="radiogroup">
                {OPCOES_OBJETIVO.map((o) => (
                  <Opcao key={o.valor} titulo={o.titulo} descricao={o.descricao} selecionado={objetivo === o.valor} onPress={() => escolherObjetivo(o.valor)} />
                ))}
              </View>
              {objetivo && objetivo !== 'manter' && (
                <View style={styles.grupoPequeno} accessibilityRole="radiogroup">
                  <Text style={styles.rotulo}>Em que ritmo?</Text>
                  {OPCOES_RITMO[objetivo].map((o) => (
                    <Opcao key={o.valor} titulo={o.titulo} descricao={o.descricao} selecionado={ritmo === o.valor} onPress={() => setRitmo(o.valor)} />
                  ))}
                </View>
              )}
            </View>
          )}

          {passo === 4 && calculo && objetivo && atividade && (
            <View style={styles.grupo}>
              <View style={styles.cartaoMeta}>
                <Text style={styles.metaRotulo}>Meta diária</Text>
                <Text style={styles.metaValor}>
                  {metaEfetiva ? formatarNumero(metaEfetiva) : '—'} <Text style={styles.metaUnidade}>kcal</Text>
                </Text>
                {metaManual != null && metaEfetiva !== calculo.metaCalculada && (
                  <Text style={styles.ajuda}>Ajustada por você</Text>
                )}
              </View>

              <View style={styles.cartao}>
                <ResumoMeta calculo={calculo} nivelAtividade={atividade} objetivo={objetivo} />
              </View>

              <CampoTexto
                rotulo="Prefere outro número?"
                value={metaManual ?? String(calculo.metaCalculada)}
                onChangeText={(t) => setMetaManual(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                sufixo="kcal"
                ajuda="Se um nutricionista já te passou uma meta, pode usar a dele."
              />
              {metaManual != null && lerNumero(metaManual) !== calculo.metaCalculada && (
                <Pressable accessibilityRole="button" onPress={() => setMetaManual(null)}>
                  <Text style={styles.link}>Usar a meta calculada ({formatarNumero(calculo.metaCalculada)} kcal)</Text>
                </Pressable>
              )}
              {metaEfetiva != null && metaManual != null && metaEfetiva < calculo.tmb && (
                <Text style={styles.alerta}>
                  Essa meta fica abaixo do seu gasto basal ({formatarNumero(calculo.tmb)} kcal). Dá para seguir assim,
                  mas costuma ser difícil de sustentar. Se puder, vale conversar com um nutricionista.
                </Text>
              )}
            </View>
          )}

          {erro && (
            <Text accessibilityLiveRegion="polite" style={styles.erro}>
              {erro}
            </Text>
          )}
        </ScrollView>

        <View style={styles.rodape}>
          {mostrarVoltar && (
            <View style={{ flex: 1 }}>
              <Botao titulo="Voltar" variante="secundario" onPress={voltar} desabilitado={salvando} />
            </View>
          )}
          <View style={{ flex: 2 }}>
            <Botao titulo={rotuloAvancar} onPress={avancar} carregando={salvando} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  progresso: { paddingHorizontal: espaco.lg, paddingTop: espaco.md, gap: espaco.sm },
  passoTexto: { fontSize: fonte.pequeno, color: cores.textoSuave, fontWeight: '600' },
  trilha: { flexDirection: 'row', gap: espaco.xs },
  segmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: cores.borda },
  segmentoAtivo: { backgroundColor: cores.primaria },
  conteudo: { padding: espaco.lg, gap: espaco.lg },
  cabecalho: { gap: espaco.sm },
  titulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  subtitulo: { fontSize: fonte.corpo, color: cores.textoSuave, lineHeight: 24 },
  grupo: { gap: espaco.lg },
  grupoPequeno: { gap: espaco.sm },
  linha: { flexDirection: 'row', gap: espaco.md },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave },
  ajuda: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 18 },
  cartao: {
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  cartaoMeta: { alignItems: 'center', paddingVertical: espaco.md, gap: espaco.xs },
  metaRotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1 },
  metaValor: { fontSize: 44, fontWeight: '800', color: cores.primaria },
  metaUnidade: { fontSize: fonte.subtitulo, fontWeight: '600', color: cores.textoSuave },
  link: { fontSize: fonte.corpo, color: cores.primaria, fontWeight: '600', paddingVertical: espaco.xs },
  alerta: { fontSize: fonte.pequeno, lineHeight: 20, color: cores.destaque },
  erro: {
    fontSize: fonte.pequeno,
    lineHeight: 20,
    padding: espaco.md,
    borderRadius: raio.sm,
    color: cores.erro,
    backgroundColor: cores.erroFundo,
  },
  rodape: {
    flexDirection: 'row',
    gap: espaco.md,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.fundo,
  },
});
