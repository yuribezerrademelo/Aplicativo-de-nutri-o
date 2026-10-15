import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { CartaoItem } from '@/components/CartaoItem';
import { Chip } from '@/components/Chip';
import { analisarRefeicao } from '@/lib/analise';
import { comentarRefeicao } from '@/lib/coaching';
import { ajustarGramas, comItens, type ResultadoAnalise } from '@/lib/estimativa';
import { formatarNumero } from '@/lib/formatos';
import { obterFoto, type FotoPreparada } from '@/lib/imagem';
import { OPCOES_TIPO_REFEICAO, salvarRefeicao, tipoPeloHorario, type TipoRefeicao } from '@/lib/refeicoes';
import { cores, espaco, fonte, raio } from '@/theme';

type Carregando = 'foto' | 'analise' | 'refinar' | 'salvar' | null;

/** Fluxo de registro: foto e/ou texto → estimativa → especificar (opcional) → confirmar. */
export default function TelaRegistrar() {
  const [foto, setFoto] = useState<FotoPreparada | null>(null);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [carregando, setCarregando] = useState<Carregando>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Refinamento: opção escolhida em cada pergunta + texto livre.
  const [escolhas, setEscolhas] = useState<Record<number, string>>({});
  const [especificacao, setEspecificacao] = useState('');
  const [tipo, setTipo] = useState<TipoRefeicao>(tipoPeloHorario());

  // Depois de confirmar: comentário do coach (null enquanto carrega).
  const [concluido, setConcluido] = useState<{ comentario: string | null; simulado?: boolean; erro?: string } | null>(null);

  const ocupado = carregando !== null;

  async function pegarFoto(origem: 'camera' | 'galeria') {
    setErro(null);
    setCarregando('foto');
    const r = await obterFoto(origem);
    setCarregando(null);
    if ('foto' in r) setFoto(r.foto);
    else if ('erro' in r) setErro(r.erro);
  }

  function entradaBase() {
    return {
      imagem: foto ? { base64: foto.base64, tipo: 'image/jpeg' as const } : undefined,
      texto: texto.trim() || undefined,
    };
  }

  async function analisar() {
    if (!foto && !texto.trim()) {
      setErro('Tire uma foto ou descreva o que comeu.');
      return;
    }
    setErro(null);
    setCarregando('analise');
    const r = await analisarRefeicao(entradaBase());
    setCarregando(null);
    if (!r.resultado) {
      setErro(r.erro);
      return;
    }
    setResultado(r.resultado);
    setEscolhas({});
    setEspecificacao('');
  }

  function montarCorrecao() {
    if (!resultado) return '';
    const respostas = Object.entries(escolhas).map(([i, opcao]) => `${resultado.perguntas[Number(i)]?.pergunta} ${opcao}`);
    return [...respostas, especificacao.trim()].filter(Boolean).join('. ');
  }

  async function refinar() {
    const correcao = montarCorrecao();
    if (!resultado || !correcao) return;
    setErro(null);
    setCarregando('refinar');
    const r = await analisarRefeicao({ ...entradaBase(), anterior: resultado, correcao });
    setCarregando(null);
    if (!r.resultado) {
      setErro(r.erro);
      return;
    }
    setResultado(r.resultado);
    setEscolhas({});
    setEspecificacao('');
  }

  function alterarItens(f: (itens: ResultadoAnalise['itens']) => ResultadoAnalise['itens']) {
    if (resultado) setResultado(comItens(resultado, f(resultado.itens)));
  }

  async function confirmar() {
    if (!resultado?.itens.length) return;
    setErro(null);
    setCarregando('salvar');
    const salva = await salvarRefeicao({ resultado, tipo, origem: foto ? 'foto' : 'texto', descricao: texto });
    setCarregando(null);
    if ('erro' in salva) {
      setErro(salva.erro);
      return;
    }
    setConcluido({ comentario: null });
    const r = await comentarRefeicao(salva.id);
    setConcluido('erro' in r ? { comentario: null, erro: r.erro } : { comentario: r.comentario, simulado: r.simulado });
  }

  function recomecar() {
    setResultado(null);
    setFoto(null);
    setTexto('');
    setErro(null);
    setEscolhas({});
    setEspecificacao('');
  }

  const correcao = montarCorrecao();

  if (concluido && resultado) {
    return (
      <SafeAreaView style={styles.tela}>
        <View style={styles.cabecalho}>
          <Text style={styles.titulo}>Registrado!</Text>
        </View>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <View style={[styles.cartao, styles.linhaTotal]}>
            {foto && <Image source={{ uri: foto.uri }} style={styles.miniatura} accessibilityIgnoresInvertColors />}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rotulo}>{OPCOES_TIPO_REFEICAO.find((o) => o.valor === tipo)?.titulo}</Text>
              <Text style={styles.total}>
                {formatarNumero(resultado.total.kcal_provavel)} <Text style={styles.unidade}>kcal</Text>
              </Text>
              <Text style={styles.nota}>
                entre {formatarNumero(resultado.total.kcal_min)} e {formatarNumero(resultado.total.kcal_max)} kcal
              </Text>
            </View>
          </View>

          <View style={[styles.cartao, styles.grupoPequeno, { backgroundColor: cores.primariaFundo, borderColor: cores.primariaFundo }]}>
            <Text style={styles.subtitulo}>Comentário do coach{concluido.simulado ? ' (simulado)' : ''}</Text>
            {concluido.comentario ? (
              <Text style={styles.texto}>{concluido.comentario}</Text>
            ) : concluido.erro ? (
              <Text style={styles.nota}>{concluido.erro} A refeição foi salva normalmente.</Text>
            ) : (
              <View style={styles.linha}>
                <ActivityIndicator color={cores.primaria} />
                <Text style={styles.nota}>Olhando o seu dia…</Text>
              </View>
            )}
          </View>
        </ScrollView>
        <View style={styles.rodape}>
          <Botao titulo="Voltar ao dia" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>{resultado ? 'Sua refeição' : 'Registrar refeição'}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} disabled={carregando === 'salvar'}>
          <Text style={styles.fechar}>Fechar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          {!resultado ? (
            <>
              {foto ? (
                <View style={styles.grupo}>
                  <Image source={{ uri: foto.uri }} style={styles.foto} accessibilityLabel="Foto da refeição" />
                  <View style={styles.linha}>
                    <View style={{ flex: 1 }}>
                      <Botao titulo="Trocar foto" variante="contorno" onPress={() => pegarFoto('camera')} desabilitado={ocupado} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Botao titulo="Remover" variante="secundario" onPress={() => setFoto(null)} desabilitado={ocupado} />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.linha}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => pegarFoto('camera')}
                    disabled={ocupado}
                    style={({ pressed }) => [styles.bloco, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.blocoTitulo}>Tirar foto</Text>
                    <Text style={styles.blocoTexto}>do prato agora</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => pegarFoto('galeria')}
                    disabled={ocupado}
                    style={({ pressed }) => [styles.bloco, styles.blocoClaro, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.blocoTitulo, { color: cores.primaria }]}>Galeria</Text>
                    <Text style={[styles.blocoTexto, { color: cores.textoSuave }]}>escolher uma foto</Text>
                  </Pressable>
                </View>
              )}

              <CampoTexto
                rotulo={foto ? 'Quer contar algo sobre o prato? (opcional)' : 'Ou descreva o que comeu'}
                value={texto}
                onChangeText={(t) => {
                  setTexto(t);
                  if (erro) setErro(null);
                }}
                placeholder={
                  foto ? 'Ex.: o frango foi frito, tinha 2 colheres de farofa' : 'Ex.: cuscuz com 2 ovos mexidos e café com leite'
                }
                multiline
                style={styles.textoLongo}
              />
              {carregando === 'foto' && <Text style={styles.nota}>Preparando a foto…</Text>}
            </>
          ) : (
            <>
              {resultado.simulado && (
                <Text style={styles.avisoSimulado}>
                  Modo simulado: estes números são de exemplo, sem IA. As estimativas reais começam quando a chave da
                  Claude API for cadastrada.
                </Text>
              )}

              {!resultado.reconhecido ? (
                <View style={styles.cartao}>
                  <Text style={styles.texto}>{resultado.observacao || 'Não reconheci uma refeição aí.'}</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.cartao, styles.linhaTotal]}>
                    {foto && <Image source={{ uri: foto.uri }} style={styles.miniatura} accessibilityIgnoresInvertColors />}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rotulo}>Estimativa</Text>
                      <Text style={styles.total}>
                        {formatarNumero(resultado.total.kcal_provavel)} <Text style={styles.unidade}>kcal</Text>
                      </Text>
                      <Text style={styles.nota}>
                        entre {formatarNumero(resultado.total.kcal_min)} e {formatarNumero(resultado.total.kcal_max)} kcal
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.macros}>
                    Proteína {formatarNumero(resultado.total.proteina_g)} g · Carboidrato{' '}
                    {formatarNumero(resultado.total.carboidrato_g)} g · Gordura {formatarNumero(resultado.total.gordura_g)} g ·
                    Fibra {formatarNumero(resultado.total.fibra_g)} g
                  </Text>

                  <View style={styles.grupoPequeno}>
                    {resultado.itens.map((item, i) => (
                      <CartaoItem
                        key={`${i}-${item.nome}-${item.gramas}-${item.kcal_provavel}`}
                        item={item}
                        onAjustarGramas={(g) => alterarItens((itens) => itens.map((it, j) => (j === i ? ajustarGramas(it, g) : it)))}
                        onRemover={() => alterarItens((itens) => itens.filter((_, j) => j !== i))}
                      />
                    ))}
                    {!resultado.itens.length && <Text style={styles.nota}>Todos os itens foram removidos.</Text>}
                  </View>

                  {(resultado.observacao || resultado.suposicoes.length > 0) && (
                    <View style={styles.grupoPequeno}>
                      <Text style={styles.subtitulo}>O que considerei</Text>
                      {resultado.suposicoes.map((s, i) => (
                        <Text key={i} style={styles.nota}>
                          • {s}
                        </Text>
                      ))}
                      {resultado.observacao ? <Text style={styles.nota}>{resultado.observacao}</Text> : null}
                    </View>
                  )}

                  <View style={[styles.cartao, styles.grupo]}>
                    <View style={{ gap: 2 }}>
                      <Text style={styles.subtitulo}>Deseja especificar algo do seu prato?</Text>
                      <Text style={styles.nota}>Preparo, ingredientes escondidos ou tamanho da porção deixam a estimativa mais precisa.</Text>
                    </View>
                    {resultado.perguntas.map((p, i) => (
                      <View key={i} style={styles.grupoPequeno}>
                        <Text style={styles.texto}>{p.pergunta}</Text>
                        <View style={styles.chips}>
                          {p.opcoes.map((opcao) => (
                            <Chip
                              key={opcao}
                              titulo={opcao}
                              selecionado={escolhas[i] === opcao}
                              onPress={() =>
                                setEscolhas((atual) => {
                                  const novo = { ...atual };
                                  if (novo[i] === opcao) delete novo[i];
                                  else novo[i] = opcao;
                                  return novo;
                                })
                              }
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                    <CampoTexto
                      rotulo="Outros detalhes"
                      value={especificacao}
                      onChangeText={setEspecificacao}
                      placeholder="Ex.: tinha mais arroz, o bife era de fígado, usei azeite"
                      multiline
                      style={styles.textoLongo}
                    />
                    <Botao
                      titulo="Atualizar estimativa"
                      variante="contorno"
                      onPress={refinar}
                      carregando={carregando === 'refinar'}
                      desabilitado={!correcao || ocupado}
                    />
                  </View>

                  <View style={styles.grupoPequeno}>
                    <Text style={styles.subtitulo}>Qual refeição foi essa?</Text>
                    <View style={styles.chips}>
                      {OPCOES_TIPO_REFEICAO.map((o) => (
                        <Chip key={o.valor} titulo={o.titulo} selecionado={tipo === o.valor} onPress={() => setTipo(o.valor)} />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </>
          )}

          {erro && (
            <Text accessibilityLiveRegion="polite" style={styles.erro}>
              {erro}
            </Text>
          )}
        </ScrollView>

        <View style={styles.rodape}>
          {!resultado ? (
            <Botao titulo="Analisar" onPress={analisar} carregando={carregando === 'analise'} desabilitado={ocupado && carregando !== 'analise'} />
          ) : (
            <View style={styles.linha}>
              <View style={{ flex: 1 }}>
                <Botao titulo="Recomeçar" variante="secundario" onPress={recomecar} desabilitado={ocupado} />
              </View>
              {resultado.reconhecido && (
                <View style={{ flex: 2 }}>
                  <Botao
                    titulo="Confirmar"
                    onPress={confirmar}
                    carregando={carregando === 'salvar'}
                    desabilitado={!resultado.itens.length || (ocupado && carregando !== 'salvar')}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
  },
  titulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  fechar: { fontSize: fonte.corpo, fontWeight: '600', color: cores.primaria },
  conteudo: { paddingHorizontal: espaco.lg, paddingBottom: espaco.lg, gap: espaco.lg },
  grupo: { gap: espaco.md },
  grupoPequeno: { gap: espaco.sm },
  linha: { flexDirection: 'row', gap: espaco.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.lg, backgroundColor: cores.borda },
  miniatura: { width: 72, height: 72, borderRadius: raio.md, backgroundColor: cores.borda },
  bloco: {
    flex: 1,
    minHeight: 120,
    borderRadius: raio.lg,
    padding: espaco.md,
    justifyContent: 'flex-end',
    backgroundColor: cores.primaria,
  },
  blocoClaro: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.borda },
  blocoTitulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.primariaTexto },
  blocoTexto: { fontSize: fonte.pequeno, color: cores.primariaTexto },
  textoLongo: { minHeight: 72, textAlignVertical: 'top', paddingVertical: espaco.sm },
  cartao: {
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  linhaTotal: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1 },
  total: { fontSize: 36, fontWeight: '800', color: cores.primaria },
  unidade: { fontSize: fonte.subtitulo, fontWeight: '600', color: cores.textoSuave },
  macros: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20, marginTop: -espaco.sm },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 22 },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  avisoSimulado: {
    fontSize: fonte.pequeno,
    lineHeight: 20,
    color: cores.alerta,
    backgroundColor: cores.alertaFundo,
    padding: espaco.md,
    borderRadius: raio.sm,
  },
  erro: {
    fontSize: fonte.pequeno,
    lineHeight: 20,
    padding: espaco.md,
    borderRadius: raio.sm,
    color: cores.erro,
    backgroundColor: cores.erroFundo,
  },
  rodape: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.fundo,
  },
});
