import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { CartaoItem } from '@/components/CartaoItem';
import { Chip } from '@/components/Chip';
import { ajustarGramas, calcularTotais, type ItemEstimado } from '@/lib/estimativa';
import { combinarDiaHora, formatarNumero, horaDe, lerHora, mascararHora, rotuloDoDia } from '@/lib/formatos';
import {
  apagarRefeicao,
  atualizarRefeicao,
  buscarRefeicao,
  OPCOES_TIPO_REFEICAO,
  type Refeicao,
  type TipoRefeicao,
} from '@/lib/refeicoes';
import { cores, espaco, fonte, raio } from '@/theme';

/** Editar uma refeição já registrada: tipo, horário e itens (gramas ou remoção). */
export default function TelaEditarRefeicao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refeicao, setRefeicao] = useState<Refeicao | null>(null);
  const [itens, setItens] = useState<ItemEstimado[]>([]);
  const [tipo, setTipo] = useState<TipoRefeicao>('outro');
  const [horario, setHorario] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    buscarRefeicao(String(id)).then((r) => {
      if (!ativo) return;
      if ('erro' in r) {
        setErro(r.erro);
        return;
      }
      setRefeicao(r.refeicao);
      setItens(r.refeicao.itens);
      setTipo(r.refeicao.tipo);
      setHorario(horaDe(new Date(r.refeicao.consumida_em)));
    });
    return () => {
      ativo = false;
    };
  }, [id]);

  const total = calcularTotais(itens);

  async function salvar() {
    if (!refeicao) return;
    const hora = lerHora(horario);
    if (!hora) {
      setErro('Informe o horário no formato HH:MM.');
      return;
    }
    if (!itens.length) {
      setErro('A refeição ficou sem itens. Para tirar do dia, use "Apagar refeição".');
      return;
    }
    setSalvando(true);
    const falha = await atualizarRefeicao(refeicao.id, {
      tipo,
      itens,
      consumidaEm: combinarDiaHora(new Date(refeicao.consumida_em), hora),
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else router.back();
  }

  function confirmarApagar() {
    if (!refeicao) return;
    Alert.alert('Apagar refeição?', 'Ela sai do seu dia e não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const falha = await apagarRefeicao(refeicao.id);
          if (falha) setErro(falha);
          else router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Editar refeição</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} disabled={salvando}>
          <Text style={styles.fechar}>Cancelar</Text>
        </Pressable>
      </View>

      {!refeicao ? (
        <View style={styles.centro}>{erro ? <Text style={styles.erro}>{erro}</Text> : <ActivityIndicator color={cores.primaria} />}</View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
            <View style={styles.cartao}>
              <Text style={styles.total}>
                {formatarNumero(total.kcal_provavel)} <Text style={styles.unidade}>kcal</Text>
              </Text>
              <Text style={styles.nota}>
                entre {formatarNumero(total.kcal_min)} e {formatarNumero(total.kcal_max)} kcal · P {formatarNumero(total.proteina_g)} g · C{' '}
                {formatarNumero(total.carboidrato_g)} g · G {formatarNumero(total.gordura_g)} g
              </Text>
            </View>

            <View style={styles.grupo}>
              {itens.map((item, i) => (
                <CartaoItem
                  key={`${i}-${item.nome}-${item.gramas}-${item.kcal_provavel}`}
                  item={item}
                  onAjustarGramas={(g) => setItens((atual) => atual.map((it, j) => (j === i ? ajustarGramas(it, g) : it)))}
                  onRemover={() => setItens((atual) => atual.filter((_, j) => j !== i))}
                />
              ))}
            </View>

            <View style={styles.grupo}>
              <Text style={styles.subtitulo}>Qual refeição foi essa?</Text>
              <View style={styles.chips}>
                {OPCOES_TIPO_REFEICAO.map((o) => (
                  <Chip key={o.valor} titulo={o.titulo} selecionado={tipo === o.valor} onPress={() => setTipo(o.valor)} />
                ))}
              </View>
              <View style={styles.linhaHorario}>
                <Text style={styles.nota}>{rotuloDoDia(new Date(refeicao.consumida_em))}, às</Text>
                <View style={{ width: 110 }}>
                  <CampoTexto
                    rotulo="Horário"
                    value={horario}
                    onChangeText={(t) => setHorario(mascararHora(t))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
            </View>

            {refeicao.comentario ? (
              <Text style={styles.nota}>O comentário do coach foi feito com os valores originais e não muda com a edição.</Text>
            ) : null}

            <Botao titulo="Apagar refeição" variante="secundario" onPress={confirmarApagar} desabilitado={salvando} />
            {erro && <Text style={styles.erro}>{erro}</Text>}
          </ScrollView>

          <View style={styles.rodape}>
            <Botao titulo="Salvar alterações" onPress={salvar} carregando={salvando} />
          </View>
        </KeyboardAvoidingView>
      )}
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
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.lg },
  conteudo: { paddingHorizontal: espaco.lg, paddingBottom: espaco.lg, gap: espaco.lg },
  cartao: {
    gap: 2,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  total: { fontSize: 32, fontWeight: '800', color: cores.primaria },
  unidade: { fontSize: fonte.subtitulo, fontWeight: '600', color: cores.textoSuave },
  grupo: { gap: espaco.sm },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  linhaHorario: { flexDirection: 'row', alignItems: 'flex-end', gap: espaco.md },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  erro: { fontSize: fonte.pequeno, color: cores.erro, lineHeight: 20 },
  rodape: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.fundo,
  },
});
