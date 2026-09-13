import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { AuthProvider } from '@/components/AuthProvider';
import { ChangePasswordGuard } from '@/components/ChangePasswordGuard';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Mi Valecito',
  description: 'Gestiona los vales y fiados de tu tienda de barrio de forma digital, rápida y segura.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <ChangePasswordGuard />
          <Navbar />
          <main className="min-vh-100 py-5">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
