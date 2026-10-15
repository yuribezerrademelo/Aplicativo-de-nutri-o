import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraDoDia } from '@/components/BarraDoDia';
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

/** Tela do dia: barra com a faixa, macros, refeições de hoje (com o comentário do coach) e a meta. */
export default function TelaInicio() {
  const { perfil } = usePerfil();
  const [refeicoes, setRefeicoes] = useState<Refeicao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarMeta, setMostrarMeta] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

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
  const vazio = !refeicoes?.length;

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
          <BarraDoDia meta={meta} kcalMin={dia.kcal_min} kcalProvavel={dia.kcal_provavel} kcalMax={dia.kcal_max} vazio={vazio} />
          <View style={styles.macros}>
            <Macro rotulo="Proteína" valor={dia.proteina_g} />
            <Macro rotulo="Carboidrato" valor={dia.carboidrato_g} />
            <Macro rotulo="Gordura" valor={dia.gordura_g} />
            <Macro rotulo="Fibra" valor={dia.fibra_g} />
          </View>
        </View>

        <Botao titulo="Registrar refeição" onPress={() => router.push('/registrar')} />

        <View style={styles.grupo}>
          <Text style={styles.subtitulo}>Refeições de hoje</Text>
          {refeicoes === null && !erro && <ActivityIndicator color={cores.primaria} />}
          {erro && <Text style={styles.erro}>{erro}</Text>}
          {refeicoes?.length === 0 && (
            <Text style={styles.nota}>Nada registrado ainda. Tire uma foto do próximo prato ou descreva o que comeu.</Text>
          )}
          {refeicoes?.map((r) => {
            const expandida = aberta === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setAberta(expandida ? null : r.id)}
                onLongPress={() => confirmarApagar(r)}
                accessibilityRole="button"
                accessibilityState={{ expanded: expandida }}
                accessibilityHint="Toque para ver detalhes; toque longo para apagar"
                style={styles.refeicao}
              >
                <View style={styles.refeicaoLinha}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.refeicaoTitulo}>
                      {TITULO_TIPO_REFEICAO[r.tipo]} · {hora(r.consumida_em)}
                      {r.simulada ? '  (simulada)' : ''}
                    </Text>
                    <Text style={styles.nota} numberOfLines={expandida ? undefined : 1}>
                      {r.itens.map((i) => i.nome).join(', ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.refeicaoKcal}>{formatarNumero(r.kcal_provavel)}</Text>
                    <Text style={styles.nota}>
                      {formatarNumero(r.kcal_min)}–{formatarNumero(r.kcal_max)}
                    </Text>
                  </View>
                </View>

                {expandida && (
                  <View style={styles.detalhes}>
                    {r.itens.map((i, n) => (
                      <View key={n} style={styles.itemLinha}>
                        <Text style={[styles.nota, { flex: 1 }]}>
                          {i.nome} · ~{formatarNumero(i.gramas)} g
                        </Text>
                        <Text style={styles.nota}>{formatarNumero(i.kcal_provavel)} kcal</Text>
                      </View>
                    ))}
                    <Text style={styles.nota}>
                      P {formatarNumero(r.proteina_g)} g · C {formatarNumero(r.carboidrato_g)} g · G {formatarNumero(r.gordura_g)} g
                    </Text>
                  </View>
                )}

                {r.comentario ? (
                  <Text style={styles.comentario} numberOfLines={expandida ? undefined : 2}>
                    {r.comentario}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {!vazio && <Text style={styles.dica}>Toque numa refeição para ver detalhes; toque longo para apagar.</Text>}
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

function Macro({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValor}>{formatarNumero(valor)} g</Text>
      <Text style={styles.macroRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.lg, gap: espaco.lg },
  saudacao: { fontSize: fonte.titulo, fontWeight: '800', color: cores.texto, paddingTop: espaco.md },
  cartao: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  macros: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco.sm },
  macro: { flex: 1, alignItems: 'center', paddingVertical: espaco.sm, borderRadius: raio.sm, backgroundColor: cores.fundo },
  macroValor: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  macroRotulo: { fontSize: 12, color: cores.textoSuave },
  nota: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  dica: { fontSize: 12, color: cores.textoSuave, textAlign: 'center' },
  grupo: { gap: espaco.sm },
  subtitulo: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  refeicao: {
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  refeicaoLinha: { flexDirection: 'row', gap: espaco.md, alignItems: 'center' },
  refeicaoTitulo: { fontSize: fonte.corpo, fontWeight: '600', color: cores.texto },
  refeicaoKcal: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  detalhes: { gap: 2, paddingTop: espaco.xs, borderTopWidth: 1, borderTopColor: cores.borda },
  itemLinha: { flexDirection: 'row', gap: espaco.sm },
  comentario: {
    fontSize: fonte.pequeno,
    lineHeight: 20,
    color: cores.texto,
    backgroundColor: cores.primariaFundo,
    padding: espaco.sm,
    borderRadius: raio.sm,
  },
  erro: { fontSize: fonte.pequeno, color: cores.erro },
  linhaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.primaria },
  acoes: { gap: espaco.sm },
});
