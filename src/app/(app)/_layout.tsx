import { Stack } from 'expo-router';

import { cores } from '@/theme';

/** Telas disponíveis apenas para quem está logado. */
export default function LayoutApp() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }} />;
}
