import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { supabaseConfigurado } from '@/lib/supabase';
import { SessaoProvider, useSessao } from '@/providers/SessaoProvider';
import { cores, espaco, fonte } from '@/theme';

export default function RootLayout() {
  if (!supabaseConfigurado) return <ConfiguracaoFaltando />;

  return (
    <SessaoProvider>
      <StatusBar style="dark" />
      <Navegacao />
    </SessaoProvider>
  );
}

/** Decide quais telas existem conforme o usuário está logado ou não. */
function Navegacao() {
  const { sessao, carregando } = useSessao();

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="entrar" />
      </Stack.Protected>
    </Stack>
  );
}

function ConfiguracaoFaltando() {
  return (
    <View style={[styles.centro, { padding: espaco.lg, gap: espaco.md }]}>
      <Text style={styles.titulo}>Falta conectar o Supabase</Text>
      <Text style={styles.texto}>
        Crie o arquivo .env na raiz do projeto (use o .env.example como modelo), preencha a URL e
        a publishable key do seu projeto e reinicie com "npx expo start --clear".
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.fundo,
  },
  titulo: { fontSize: fonte.subtitulo, fontWeight: '700', color: cores.texto, textAlign: 'center' },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center', lineHeight: 24 },
});
