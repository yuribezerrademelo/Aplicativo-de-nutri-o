import { StyleSheet, Text, View } from 'react-native';

import { formatarNumero, formatarPercentual } from '@/lib/formatos';
import type { CalculoMeta, NivelAtividade, Objetivo } from '@/lib/metabolismo';
import { DESCRICAO_METODO_TMB, TITULO_ATIVIDADE } from '@/lib/perfil';
import { cores, espaco, fonte } from '@/theme';

type Props = {
  calculo: CalculoMeta;
  nivelAtividade: NivelAtividade;
  objetivo: Objetivo;
};

/** Mostra, passo a passo, de onde veio a meta calculada. */
export function ResumoMeta({ calculo, nivelAtividade, objetivo }: Props) {
  const fator = formatarNumero(calculo.fatorAtividade, 3);
  const rotuloAjuste =
    objetivo === 'perder' ? 'Déficit para perder peso' : objetivo === 'ganhar' ? 'Superávit para ganhar peso' : 'Manutenção';

  return (
    <View style={styles.container}>
      <Linha
        titulo="Gasto basal (TMB)"
        valor={`${formatarNumero(calculo.tmb)} kcal`}
        detalhe={`O que seu corpo gasta em repouso, ${DESCRICAO_METODO_TMB[calculo.metodoTmb]}.`}
      />
      <Linha
        titulo="Gasto total do dia"
        valor={`${formatarNumero(calculo.gastoTotal)} kcal`}
        detalhe={`TMB × ${fator} (${TITULO_ATIVIDADE[nivelAtividade].toLowerCase()}).`}
      />
      <Linha
        titulo={rotuloAjuste}
        valor={formatarPercentual(calculo.ajuste)}
        detalhe={
          calculo.limitadaPelaTmb
            ? 'Limitamos a meta ao seu gasto basal para o déficit não ficar agressivo demais.'
            : undefined
        }
      />
    </View>
  );
}

function Linha({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <View style={styles.linha}>
      <View style={styles.linhaTopo}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>
      {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: espaco.md },
  linha: { gap: 2 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: espaco.sm },
  titulo: { fontSize: fonte.corpo, color: cores.texto, flexShrink: 1 },
  valor: { fontSize: fonte.corpo, fontWeight: '700', color: cores.texto },
  detalhe: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 18 },
});
