import { StyleSheet, Text, View } from 'react-native';

import { formatarNumero } from '@/lib/formatos';
import { cores, espaco, fonte } from '@/theme';

type Props = {
  meta: number;
  kcalMin: number;
  kcalProvavel: number;
  kcalMax: number;
  /** Sem refeições ainda: mostra só a meta, sem faixa. */
  vazio?: boolean;
};

const pct = (v: number, escala: number) => `${Math.max(0, Math.min(100, (v / escala) * 100))}%` as const;

/**
 * Barra do dia: o preenchimento sólido vai até o valor provável, a faixa clara
 * mostra a margem (mínimo a máximo) e um traço marca a meta. O número provável
 * fica no canto superior e a faixa em texto menor logo abaixo.
 */
export function BarraDoDia({ meta, kcalMin, kcalProvavel, kcalMax, vazio }: Props) {
  // Escala com folga para a faixa caber quando passa da meta.
  const escala = Math.max(meta, vazio ? 0 : kcalMax) * 1.08;
  const passou = kcalProvavel > meta;
  const restante = Math.round(meta - kcalProvavel);

  const descricao = vazio
    ? `Nenhuma refeição registrada. Meta de ${formatarNumero(meta)} quilocalorias.`
    : `${formatarNumero(kcalProvavel)} de ${formatarNumero(meta)} quilocalorias, entre ${formatarNumero(kcalMin)} e ${formatarNumero(kcalMax)}.`;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={descricao}>
      <View style={styles.topo}>
        <Text style={styles.rotulo}>Hoje</Text>
        <Text style={styles.numeros}>
          <Text style={[styles.consumido, passou && { color: cores.destaque }]}>{formatarNumero(kcalProvavel)}</Text>
          <Text style={styles.meta}> / {formatarNumero(meta)} kcal</Text>
        </Text>
      </View>

      <View style={styles.trilha}>
        <View style={[styles.preenchido, { width: pct(vazio ? 0 : kcalProvavel, escala) }, passou && { backgroundColor: cores.destaque }]} />
        {!vazio && (
          <>
            {/* margem para baixo: clareia o trecho final do preenchimento */}
            <View style={[styles.faixaAbaixo, { left: pct(kcalMin, escala), width: pct(Math.max(0, kcalProvavel - kcalMin), escala) }]} />
            {/* margem para cima: faixa clara depois do provável */}
            <View
              style={[
                styles.faixaAcima,
                { left: pct(kcalProvavel, escala), width: pct(Math.max(0, kcalMax - kcalProvavel), escala) },
                passou && { backgroundColor: cores.destaqueFundo },
              ]}
            />
          </>
        )}
        <View style={[styles.marcaMeta, { left: pct(meta, escala) }]} />
      </View>

      <View style={styles.rodape}>
        <Text style={styles.detalhe}>
          {vazio ? 'Nenhuma refeição ainda' : `entre ${formatarNumero(kcalMin)} e ${formatarNumero(kcalMax)} kcal`}
        </Text>
        <Text style={styles.detalhe}>
          {restante >= 0 ? `faltam ~${formatarNumero(restante)}` : `~${formatarNumero(-restante)} acima`}
        </Text>
      </View>
    </View>
  );
}

const ALTURA = 18;

const styles = StyleSheet.create({
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: espaco.sm },
  rotulo: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: 1 },
  numeros: { textAlign: 'right' },
  consumido: { fontSize: 30, fontWeight: '800', color: cores.primaria },
  meta: { fontSize: fonte.corpo, fontWeight: '600', color: cores.textoSuave },
  trilha: {
    height: ALTURA,
    borderRadius: ALTURA / 2,
    backgroundColor: cores.fundo,
    borderWidth: 1,
    borderColor: cores.borda,
    overflow: 'hidden',
  },
  faixaAbaixo: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.35)' },
  faixaAcima: { position: 'absolute', top: 0, bottom: 0, backgroundColor: cores.primariaFundo },
  preenchido: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: cores.primaria },
  marcaMeta: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: cores.texto },
  rodape: { flexDirection: 'row', justifyContent: 'space-between', marginTop: espaco.xs },
  detalhe: { fontSize: fonte.pequeno, color: cores.textoSuave },
});

