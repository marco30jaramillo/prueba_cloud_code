import type { Metadata } from 'next';

// La URL lleva el token de activación: no debe viajar en el encabezado Referer
// ni indexarse.
export const metadata: Metadata = {
  title: 'Activar cuenta - Mi Valecito',
  referrer: 'no-referrer',
  robots: { index: false, follow: false }
};

export default function ActivarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
