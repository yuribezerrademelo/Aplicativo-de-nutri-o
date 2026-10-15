import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Confianca, ItemEstimado } from '@/lib/estimativa';
import { formatarNumero, lerNumero } from '@/lib/formatos';
import { cores, espaco, fonte, raio } from '@/theme';

type Props = {
  item: ItemEstimado;
  onAjustarGramas: (gramas: number) => void;
  onRemover: () => void;
};

const ESTILO_CONFIANCA: Record<Confianca, { rotulo: string; cor: string; fundo: string }> = {
  alta: { rotulo: 'confiança alta', cor: cores.primaria, fundo: cores.primariaFundo },
  media: { rotulo: 'confiança média', cor: cores.alerta, fundo: cores.alertaFundo },
  baixa: { rotulo: 'confiança baixa', cor: cores.destaque, fundo: cores.destaqueFundo },
};

/** Um item da estimativa, com ajuste de gramas e remoção. */
export function CartaoItem({ item, onAjustarGramas, onRemover }: Props) {
  const [editando, setEditando] = useState(false);
  const [gramas, setGramas] = useState(String(item.gramas));
  const confianca = ESTILO_CONFIANCA[item.confianca];
  const gramasValidas = (lerNumero(gramas) ?? 0) > 0;

  function aplicar() {
    const g = lerNumero(gramas);
    if (g && g > 0) onAjustarGramas(g);
    setEditando(false);
  }

  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        <View style={styles.textos}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text style={styles.detalhe}>
            {item.porcao ? `${item.porcao} · ` : ''}~{formatarNumero(item.gramas)} g{item.preparo ? ` · ${item.preparo}` : ''}
          </Text>
        </View>
        <View style={styles.kcal}>
          <Text style={styles.kcalValor}>{formatarNumero(item.kcal_provavel)}</Text>
          <Text style={styles.kcalFaixa}>
            {formatarNumero(item.kcal_min)}–{formatarNumero(item.kcal_max)} kcal
          </Text>
        </View>
      </View>

      <View style={styles.rodape}>
        <Text style={[styles.selo, { color: confianca.cor, backgroundColor: confianca.fundo }]}>{confianca.rotulo}</Text>
        <View style={styles.acoes}>
          <Pressable accessibilityRole="button" onPress={() => setEditando(!editando)} hitSlop={8}>
            <Text style={styles.acao}>{editando ? 'Cancelar' : 'Ajustar gramas'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${item.nome}`} onPress={onRemover} hitSlop={8}>
            <Text style={[styles.acao, { color: cores.textoSuave }]}>Remover</Text>
          </Pressable>
        </View>
      </View>

      {editando && (
        <View style={styles.edicao}>
          <TextInput
            accessibilityLabel={`Gramas de ${item.nome}`}
            value={gramas}
            onChangeText={setGramas}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={aplicar}
            style={styles.input}
          />
          <Text style={styles.detalhe}>g</Text>
          <Pressable
            accessibilityRole="button"
            onPress={aplicar}
            disabled={!gramasValidas}
            style={[styles.botaoOk, !gramasValidas && { opacity: 0.5 }]}
          >
            <Text style={styles.botaoOkTexto}>Aplicar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: espaco.sm,
    padding: espaco.md,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  topo: { flexDirection: 'row', gap: espaco.md },
  textos: { flex: 1, gap: 2 },
  nome: { fontSize: fonte.corpo, fontWeight: '600', color: cores.texto },
  detalhe: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 18 },
  kcal: { alignItems: 'flex-end' },
  kcalValor: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  kcalFaixa: { fontSize: fonte.pequeno, color: cores.textoSuave },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaco.sm },
  selo: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    borderRadius: raio.sm,
    overflow: 'hidden',
  },
  acoes: { flexDirection: 'row', gap: espaco.md },
  acao: { fontSize: fonte.pequeno, fontWeight: '600', color: cores.primaria },
  edicao: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  input: {
    width: 90,
    minHeight: 44,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    fontSize: fonte.corpo,
    color: cores.texto,
  },
  botaoOk: {
    minHeight: 44,
    paddingHorizontal: espaco.md,
    borderRadius: raio.sm,
    backgroundColor: cores.primaria,
    justifyContent: 'center',
  },
  botaoOkTexto: { color: cores.primariaTexto, fontWeight: '600', fontSize: fonte.pequeno + 1 },
});
