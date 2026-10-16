import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { adicionarFato, apagarFato, carregarMemoria, descreverVies, type MemoriaSalva, type ResumoHistorico } from '@/lib/memoria';
import { cores, espaco, fonte, raio } from '@/theme';

/** O que o app aprendeu sobre o usuário: fatos (automáticos e escritos), alimentos frequentes e viés. */
export default function TelaMemoria() {
  const [memorias, setMemorias] = useState<MemoriaSalva[] | null>(null);
  const [resumo, setResumo] = useState<ResumoHistorico | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState('');
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    const r = await carregarMemoria();
    if ('erro' in r) setErro(r.erro);
    else {
      setErro(null);
      setMemorias(r.memorias);
      setResumo(r.resumo);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      carregarMemoria().then((r) => {
        if (!ativo) return;
        if ('erro' in r) setErro(r.erro);
        else {
          setMemorias(r.memorias);
          setResumo(r.resumo);
        }
      });
      return () => {
        ativo = false;
      };
    }, []),
  );

  async function adicionar() {
    setSalvando(true);
    const falha = await adicionarFato(novo);
    setSalvando(false);
    if (falha) {
      setErro(falha);
      return;
    }
    setNovo('');
    setErro(null);
    recarregar();
  }

  function confirmarApagar(m: MemoriaSalva) {
    Alert.alert('Esquecer este fato?', m.texto, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Esquecer',
        style: 'destructive',
        onPress: async () => {
          const falha = await apagarFato(m.id);
          if (falha) setErro(falha);
          else setMemorias((atual) => (atual ?? []).filter((x) => x.id !== m.id));
        },
      },
    ]);
  }

  const vies = resumo ? descreverVies(resumo.vies) : null;

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Minha memória</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.fechar}>Voltar</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
          <Text style={styles.nota}>
            O que o app aprendeu com as suas correções. Isso vai junto em cada análise para as estimativas ficarem mais
            próximas do seu jeito de comer. A foto da refeição atual sempre vale mais que a memória.
          </Text>

          {memorias === null && !erro && <ActivityIndicator color={cores.primaria} />}

          <View style={styles.grupo}>
            <Text style={styles.subtitulo}>Fatos sobre você</Text>
            {memorias?.length === 0 && (
              <Text style={styles.nota}>
                Nada ainda. Quando você ajustar as gramas de um item ou especificar o preparo, o app guarda o que se repete.
              </Text>
            )}
            {memorias?.map((m) => (
              <View key={m.id} style={styles.fato}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.texto}>{m.texto}</Text>
                  <Text style={[styles.selo, m.origem === 'manual' && styles.seloManual]}>
                    {m.origem === 'manual' ? 'escrito por você' : 'aprendido'}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Esquecer: ${m.texto}`} onPress={() => confirmarApagar(m)} hitSlop={8}>
                  <Text style={styles.esquecer}>Esquecer</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={[styles.cartao, styles.grupo]}>
            <CampoTexto
              rotulo="Ensinar algo ao app"
              value={novo}
              onChangeText={(t) => {
                setNovo(t);
                if (erro) setErro(null);
              }}
              placeholder="Ex.: uso prato fundo pequeno; meu café é sempre sem açúcar"
              multiline
              maxLength={300}
              style={{ minHeight: 64, textAlignVertical: 'top', paddingVertical: espaco.sm }}
            />
            <Botao titulo="Guardar" variante="contorno" onPress={adicionar} carregando={salvando} desabilitado={novo.trim().length < 3} />
          </View>

          {resumo && (resumo.frequentes.length > 0 || vies) && (
            <View style={styles.grupo}>
              <Text style={styles.subtitulo}>Seu histórico (30 dias)</Text>
              {vies && <Text style={styles.destaque}>{vies}</Text>}
              {resumo.frequentes.map((f) => (
                <Text key={f.nome} style={styles.nota}>
                  • {f.nome}: {f.vezes} vezes, cerca de {f.gramasMediana} g{f.preparo ? `, geralmente ${f.preparo}` : ''}
                </Text>
              ))}
            </View>
          )}

          {erro && <Text style={styles.erro}>{erro}</Text>}
        </ScrollView>
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
  conteudo: { paddingHorizontal: espaco.lg, paddingBottom: espaco.xl, gap: espaco.lg },
  grupo: { gap: espaco.sm },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 22 },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  destaque: {
    fontSize: fonte.pequeno,
    lineHeight: 20,
    color: cores.alerta,
    backgroundColor: cores.alertaFundo,
    padding: espaco.sm,
    borderRadius: raio.sm,
  },
  cartao: {
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  fato: {
    flexDirection: 'row',
    gap: espaco.md,
    alignItems: 'flex-start',
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  selo: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: cores.primaria,
    backgroundColor: cores.primariaFundo,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    borderRadius: raio.sm,
    overflow: 'hidden',
  },
  seloManual: { color: cores.alerta, backgroundColor: cores.alertaFundo },
  esquecer: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave },
  erro: { fontSize: fonte.pequeno, color: cores.erro },
});
