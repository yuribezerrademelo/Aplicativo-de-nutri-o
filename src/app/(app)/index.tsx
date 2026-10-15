import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { ResumoMeta } from '@/components/ResumoMeta';
import { formatarNumero } from '@/lib/formatos';
import { calcularMeta } from '@/lib/metabolismo';
import { dadosMetabolicosDoPerfil, perfilCompleto } from '@/lib/perfil';
import { apagarRefeicao, listarRefeicoesDoDia, somarDia, TITULO_TIPO_REFEICAO, type Refeicao } from '@/lib/refeicoes';
import { supabase } from '@/lib/supabase';
import { usePerfil } from '@/providers/PerfilProvider';
import { cores, espaco, fonte, raio } from '@/theme';

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Tela inicial: refeições de hoje e meta. Na etapa 4 ganha a barra de progresso e o coaching. */
export default function TelaInicio() {
  const { perfil } = usePerfil();
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarMeta, setMostrarMeta] = useState(false);

  // Recarrega sempre que a tela volta ao foco (por exemplo, depois de registrar).
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarRefeicoesDoDia().then((r) => {
        if (!ativo) return;
        if ('erro' in r) setErro(r.erro);
        else {
          setErro(null);
          setRefeicoes(r.refeicoes);
        }
      });
      return () => {
        ativo = false;
      };
    }, []),
  );

  if (!perfilCompleto(perfil)) return null;

  const dados = dadosMetabolicosDoPerfil(perfil)!;
  const calculo = calcularMeta(dados);
  const meta = perfil.meta_kcal;
  const dia = somarDia(refeicoes ?? []);
  const restante = meta - dia.kcal_provavel;

  function confirmarApagar(r: Refeicao) {
    Alert.alert('Apagar refeição?', `${TITULO_TIPO_REFEICAO[r.tipo]} das ${hora(r.consumida_em)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          const falha = await apagarRefeicao(r.id);
          if (falha) setErro(falha);
          else setRefeicoes((atual) => (atual ?? []).filter((x) => x.id !== r.id));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.saudacao}>{perfil.nome ? `Olá, ${perfil.nome}!` : 'Olá!'}</Text>

        <View style={styles.cartao}>
          <Text style={styles.rotulo}>Hoje</Text>
          <Text style={styles.consumido}>
            {formatarNumero(dia.kcal_provavel)} <Text style={styles.deMeta}>/ {formatarNumero(meta)} kcal</Text>
          </Text>
          {refeicoes && refeicoes.length > 0 && (
            <Text style={styles.nota}>
              entre {formatarNumero(dia.kcal_min)} e {formatarNumero(dia.kcal_max)} kcal
            </Text>
          )}
          <Text style={styles.texto}>
            {restante >= 0
              ? `Restam cerca de ${formatarNumero(restante)} kcal para a sua meta.`
              : `Você passou cerca de ${formatarNumero(-restante)} kcal da meta hoje. Faz parte; amanhã é outro dia.`}
          </Text>
        </View>

        <Botao titulo="Registrar refeição" onPress={() => router.push('/registrar')} />

        <View style={styles.grupo}>
          <Text style={styles.subtitulo}>Refeições de hoje</Text>
          {refeicoes === null && !erro && <ActivityIndicator color={cores.primaria} />}
          {erro && <Text style={styles.erro}>{erro}</Text>}
          {refeicoes?.length === 0 && (
            <Text style={styles.nota}>Nada registrado ainda. Tire uma foto do próximo prato ou descreva o que comeu.</Text>
          )}
          {refeicoes?.map((r) => (
            <Pressable
              key={r.id}
              onLongPress={() => confirmarApagar(r)}
              accessibilityHint="Toque longo para apagar"
              style={styles.refeicao}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.refeicaoTitulo}>
                  {TITULO_TIPO_REFEICAO[r.tipo]} · {hora(r.consumida_em)}
                  {r.simulada ? '  (simulada)' : ''}
                </Text>
                <Text style={styles.nota} numberOfLines={2}>
                  {r.itens.map((i) => i.nome).join(', ')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.refeicaoKcal}>{formatarNumero(r.kcal_provavel)}</Text>
                <Text style={styles.nota}>
                  {formatarNumero(r.kcal_min)}–{formatarNumero(r.kcal_max)}
                </Text>
              </View>
            </Pressable>
          ))}
          {refeicoes && refeicoes.length > 0 && <Text style={styles.dica}>Toque longo numa refeição para apagar.</Text>}
        </View>

        <View style={styles.cartao}>
          <Pressable accessibilityRole="button" onPress={() => setMostrarMeta(!mostrarMeta)} style={styles.linhaMeta}>
            <Text style={styles.subtitulo}>Como sua meta foi calculada</Text>
            <Text style={styles.link}>{mostrarMeta ? 'Ocultar' : 'Ver'}</Text>
          </Pressable>
          {mostrarMeta && (
            <View style={{ gap: espaco.md, marginTop: espaco.md }}>
              {perfil.meta_ajustada_manualmente && (
                <Text style={styles.nota}>
                  Meta ajustada por você. A calculada pelos seus dados seria {formatarNumero(calculo.metaCalculada)} kcal.
                </Text>
              )}
              <ResumoMeta calculo={calculo} nivelAtividade={dados.nivelAtividade} objetivo={dados.objetivo} />
            </View>
          )}
        </View>

        <View style={styles.acoes}>
          <Botao titulo="Editar meus dados" variante="contorno" onPress={() => router.push('/editar-perfil')} />
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
    gap: espaco.xs,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1 },
  consumido: { fontSize: 40, fontWeight: '800', color: cores.primaria },
  deMeta: { fontSize: fonte.subtitulo, fontWeight: '600', color: cores.textoSuave },
  texto: { fontSize: fonte.corpo, color: cores.texto, lineHeight: 22, marginTop: espaco.xs },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  dica: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
  grupo: { gap: espaco.sm },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  refeicao: {
    flexDirection: 'row',
    gap: espaco.md,
    alignItems: 'center',
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  refeicaoTitulo: { fontSize: fonte.corpo, fontWeight: '600', color: cores.texto },
  refeicaoKcal: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  erro: { fontSize: fonte.pequeno, color: cores.erro },
  linhaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.primaria },
  acoes: { gap: espaco.sm },
});
