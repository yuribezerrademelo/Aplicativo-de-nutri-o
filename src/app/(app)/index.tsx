import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { supabase } from '@/lib/supabase';
import { useSessao } from '@/providers/SessaoProvider';
import { cores, espaco, fonte, raio } from '@/theme';

/** Tela provisória: na etapa 1 vira o onboarding, na etapa 4 a tela do dia. */
export default function TelaInicio() {
  const { sessao } = useSessao();

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>Você entrou!</Text>
        <Text style={styles.texto}>Conectado como {sessao?.user.email}</Text>

        <View style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>Próximo passo</Text>
          <Text style={styles.texto}>
            Aqui vai entrar o cadastro dos seus dados (peso, altura, atividade e objetivo) e o cálculo da
            sua meta diária.
          </Text>
        </View>
      </View>

      <Botao titulo="Sair" variante="secundario" onPress={() => supabase.auth.signOut()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: espaco.lg, justifyContent: 'space-between' },
  conteudo: { gap: espaco.md, paddingTop: espaco.xl },
  titulo: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, lineHeight: 24 },
  cartao: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  cartaoTitulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.destaque },
});
