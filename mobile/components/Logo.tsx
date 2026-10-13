import React from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { colores, fuentes } from '@/lib/tema';

interface LogoProps {
  /** Alto del isotipo en px. */
  alto?: number;
  /** Si es false, solo el isotipo. */
  conNombre?: boolean;
  color?: string;
}

/** Isotipo aprobado (cuaderno con vale) tomado de marca/logo/isotipo-cuaderno-vale.svg. */
export function Logo({ alto = 32, conNombre = true, color = colores.azul }: LogoProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={alto} height={alto} viewBox="0 0 24 24" accessibilityLabel="Mi Valecito">
        <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M5.65 20H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4.16" />
          <Path d="M1 6h4M1 10h4M1 14h4" />
          <Path d="M7.39 15.99l10.18-6.36a1 1 0 0 1 1.38.32l.74 1.18a1.6 1.6 0 0 0 1.69 2.72l.75 1.18a1 1 0 0 1-.32 1.38l-10.18 6.36a1 1 0 0 1-1.38-.32l-.74-1.18a1.6 1.6 0 0 0-1.69-2.72l-.75-1.18a1 1 0 0 1 .32-1.38z" />
        </G>
      </Svg>
      {conNombre && <Text style={{ fontFamily: fuentes.extrabold, fontSize: alto * 0.75, color }}>Mi Valecito</Text>}
    </View>
  );
}
