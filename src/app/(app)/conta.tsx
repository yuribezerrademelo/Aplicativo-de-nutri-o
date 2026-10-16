import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { consentirContribuicao, excluirConta, retirarConsentimento } from '@/lib/conta';
import { supabase } from '@/lib/supabase';
import { usePerfil } from '@/providers/PerfilProvider';
import { useSessao } from '@/providers/SessaoProvider';
import { cores, espaco, fonte, raio } from '@/theme';

/** Conta e privacidade: consentimento da base coletiva, sair e excluir a conta. */
export default function TelaConta() {
  const { sessao } = useSessao();
  const { perfil, recarregar } = usePerfil();
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const contribuindo = !!perfil?.contribuir_base_coletiva;

  async function alternarContribuicao(ativar: boolean) {
    if (!sessao) return;
    if (!ativar) {
      Alert.alert(
        'Parar de contribuir?',
        'Tudo o que você já contribuiu será apagado da base coletiva.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Parar e apagar', style: 'destructive', onPress: () => aplicar(false) },
        ],
      );
      return;
    }
    aplicar(true);
  }

  async function aplicar(ativar: boolean) {
    setSalvando(true);
    setErro(null);
    const falha = ativar ? await consentirContribuicao(sessao!.user.id) : await retirarConsentimento();
    setSalvando(false);
    if (falha) setErro(falha);
    else recarregar();
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir sua conta?',
      'Seu perfil, refeições, memória e contribuições serão apagados para sempre. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir tudo',
          style: 'destructive',
          onPress: async () => {
            setExcluindo(true);
            const falha = await excluirConta();
            setExcluindo(false);
            if (falha) setErro(falha);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Conta e privacidade</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.fechar}>Voltar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.nota}>Conectado como {sessao?.user.email}</Text>

        <View style={[styles.cartao, styles.grupo]}>
          <View style={styles.linha}>
            <Text style={[styles.subtitulo, { flex: 1 }]}>Contribuir com a base coletiva</Text>
            <Switch
              accessibilityLabel="Contribuir com a base coletiva"
              value={contribuindo}
              onValueChange={alternarContribuicao}
              disabled={salvando}
              trackColor={{ true: cores.primaria, false: cores.borda }}
              thumbColor={cores.superficie}
            />
          </View>
          <Text style={styles.texto}>
            Quando você informa o peso de um alimento, esse número pode ajudar a deixar as estimativas de todo mundo mais
            precisas (por exemplo, quanto pesa de verdade um filé de frango fino).
          </Text>
          <Text style={styles.nota}>• Vai só: alimento, preparo, peso estimado, peso que você confirmou e calorias por 100 g.</Text>
          <Text style={styles.nota}>• Nunca vai: foto, nome, e-mail, horário ou qualquer coisa que identifique você.</Text>
          <Text style={styles.nota}>• Um número só é usado quando vem de pelo menos 5 pessoas diferentes.</Text>
          <Text style={styles.nota}>• Ao desligar, tudo o que você contribuiu é apagado.</Text>
          {contribuindo && perfil?.consentimento_em && (
            <Text style={styles.nota}>
              Você autorizou em {new Date(perfil.consentimento_em).toLocaleDateString('pt-BR')}.
            </Text>
          )}
        </View>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.grupo}>
          <Botao titulo="Sair da conta" variante="contorno" onPress={() => supabase.auth.signOut()} desabilitado={excluindo} />
          <Botao titulo="Excluir minha conta" variante="secundario" onPress={confirmarExclusao} carregando={excluindo} />
        </View>
      </ScrollView>
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
  cartao: {
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  grupo: { gap: espaco.sm },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 22 },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  erro: { fontSize: fonte.pequeno, color: cores.erro, lineHeight: 20 },
});
