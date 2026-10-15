import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { analisarRefeicao, type ResultadoAnalise } from '@/lib/analise';
import { formatarNumero } from '@/lib/formatos';
import { cores, espaco, fonte, raio } from '@/theme';

/**
 * Cartão provisório da etapa 2: testa o motor de análise por texto, de ponta a ponta.
 * Na etapa 3 é substituído pelo fluxo de registro com foto.
 */
export function TesteAnalise() {
  const [texto, setTexto] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function analisar() {
    if (!texto.trim()) {
      setErro('Descreva a refeição primeiro.');
      return;
    }
    setAnalisando(true);
    setErro(null);
    setResultado(null);
    const r = await analisarRefeicao({ texto });
    setAnalisando(false);
    if (r.resultado) setResultado(r.resultado);
    else setErro(r.erro);
  }

  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>Testar o motor de análise</Text>
      <CampoTexto
        rotulo="Descreva uma refeição"
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          if (erro) setErro(null);
        }}
        placeholder="Ex.: cuscuz com 2 ovos mexidos e café com leite"
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top', paddingVertical: espaco.sm }}
      />
      <Botao titulo="Analisar" onPress={analisar} carregando={analisando} />

      {erro && <Text style={styles.erro}>{erro}</Text>}

      {resultado && !resultado.reconhecido && <Text style={styles.texto}>{resultado.observacao || 'Não reconheci uma refeição aí.'}</Text>}

      {resultado?.reconhecido && (
        <View style={styles.resultado}>
          <Text style={styles.total}>
            {formatarNumero(resultado.total.kcal_provavel)} kcal
          </Text>
          <Text style={styles.texto}>
            entre {formatarNumero(resultado.total.kcal_min)} e {formatarNumero(resultado.total.kcal_max)} · P{' '}
            {formatarNumero(resultado.total.proteina_g)} g · C {formatarNumero(resultado.total.carboidrato_g)} g · G{' '}
            {formatarNumero(resultado.total.gordura_g)} g · fibra {formatarNumero(resultado.total.fibra_g)} g
          </Text>
          {resultado.itens.map((i, n) => (
            <Text key={n} style={styles.item}>
              • {i.nome} ({i.porcao}, ~{i.gramas} g): {i.kcal_provavel} kcal [{i.kcal_min}–{i.kcal_max}] · confiança {i.confianca}
            </Text>
          ))}
          {resultado.perguntas.map((p, n) => (
            <Text key={n} style={styles.texto}>
              ? {p.pergunta} ({p.opcoes.join(' / ')})
            </Text>
          ))}
          {resultado.observacao ? <Text style={styles.texto}>{resultado.observacao}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.lg,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto },
  resultado: { gap: espaco.sm },
  total: { fontSize: fonte.titulo, fontWeight: '800', color: cores.primaria },
  texto: { fontSize: fonte.pequeno, color: cores.textoSuave, lineHeight: 20 },
  item: { fontSize: fonte.pequeno, color: cores.texto, lineHeight: 20 },
  erro: { fontSize: fonte.pequeno, color: cores.erro, lineHeight: 20 },
});
