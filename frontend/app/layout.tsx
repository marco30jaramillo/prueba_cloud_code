import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { AuthProvider } from '@/components/AuthProvider';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Auth System',
  description: 'Sistema de autenticación seguro con roles y permisos'
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
          <Navbar />
          <main className="min-vh-100 py-5">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
