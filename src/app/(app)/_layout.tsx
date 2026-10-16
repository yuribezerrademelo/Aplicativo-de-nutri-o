import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { perfilCompleto } from '@/lib/perfil';
import { PerfilProvider, usePerfil } from '@/providers/PerfilProvider';
import { cores, espaco, fonte } from '@/theme';

/** Telas de quem está logado. Sem perfil completo, só o onboarding fica disponível. */
export default function LayoutApp() {
  return (
    <PerfilProvider>
      <NavegacaoApp />
    </PerfilProvider>
  );
}

function NavegacaoApp() {
  const { perfil, carregando, erro, recarregar } = usePerfil();

  if (carregando && !perfil) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={cores.primaria} size="large" />
      </View>
    );
  }

  if (erro && !perfil) {
    return (
      <View style={[styles.centro, { padding: espaco.lg, gap: espaco.md }]}>
        <Text style={styles.texto}>{erro}</Text>
        <Botao titulo="Tentar de novo" onPress={recarregar} />
      </View>
    );
  }

  const completo = perfilCompleto(perfil);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
      <Stack.Protected guard={completo}>
        <Stack.Screen name="index" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="registrar" options={{ presentation: 'modal' }} />
        <Stack.Screen name="memoria" />
        <Stack.Screen name="refeicao/[id]" />
        <Stack.Screen name="conta" />
      </Stack.Protected>
      <Stack.Protected guard={!completo}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
  texto: { fontSize: fonte.corpo, color: cores.textoSuave, textAlign: 'center', lineHeight: 24 },
});
