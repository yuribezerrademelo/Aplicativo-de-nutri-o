import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { ResumoMeta } from '@/components/ResumoMeta';
import { formatarNumero } from '@/lib/formatos';
import { calcularMeta } from '@/lib/metabolismo';
import { dadosMetabolicosDoPerfil, perfilCompleto } from '@/lib/perfil';
import { supabase } from '@/lib/supabase';
import { usePerfil } from '@/providers/PerfilProvider';
import { cores, espaco, fonte, raio } from '@/theme';

/** Tela inicial provisória: mostra a meta. Na etapa 4 vira a tela do dia. */
export default function TelaInicio() {
  const { perfil } = usePerfil();
  if (!perfilCompleto(perfil)) return null;

  const dados = dadosMetabolicosDoPerfil(perfil)!;
  const calculo = calcularMeta(dados);
  const ajustada = perfil.meta_ajustada_manualmente;

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.saudacao}>{perfil.nome ? `Olá, ${perfil.nome}!` : 'Olá!'}</Text>

        <View style={styles.cartao}>
          <Text style={styles.metaRotulo}>Sua meta diária</Text>
          <Text style={styles.metaValor}>
            {formatarNumero(perfil.meta_kcal)} <Text style={styles.metaUnidade}>kcal</Text>
          </Text>
          {ajustada && (
            <Text style={styles.nota}>
              Ajustada por você. A calculada pelos seus dados seria {formatarNumero(calculo.metaCalculada)} kcal.
            </Text>
          )}
          <View style={styles.divisor} />
          <ResumoMeta calculo={calculo} nivelAtividade={dados.nivelAtividade} objetivo={dados.objetivo} />
        </View>

        <View style={[styles.cartao, styles.cartaoEmBreve]}>
          <Text style={styles.emBreveTitulo}>Em breve</Text>
          <Text style={styles.nota}>
            Registrar refeições por foto ou texto e ver o saldo do dia em relação a essa meta.
          </Text>
        </View>

        <View style={styles.acoes}>
          <Botao titulo="Editar meus dados" onPress={() => router.push('/editar-perfil')} />
          <Botao titulo="Sair" variante="secundario" onPress={() => supabase.auth.signOut()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.lg },
  saudacao: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto, paddingTop: espaco.md },
  cartao: {
    gap: espaco.sm,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  metaRotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1 },
  metaValor: { fontSize: 44, fontWeight: '800', color: cores.primaria },
  metaUnidade: { fontSize: fonte.subtitulo, fontWeight: '600', color: cores.textoSuave },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  divisor: { height: 1, backgroundColor: cores.borda, marginVertical: espaco.sm },
  cartaoEmBreve: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  emBreveTitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.destaque },
  acoes: { gap: espaco.sm },
});
