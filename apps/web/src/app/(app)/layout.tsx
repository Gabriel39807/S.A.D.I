import AuthGuard from "@/components/AuthGuard";

/**
 * Layout base (zona autenticada).
 *
 * IMPORTANTE:
 * - El layout específico (admin/aprendiz) se define en sus carpetas.
 * - Aquí solo validamos sesión y aplicamos el fondo general.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>
    </AuthGuard>
  );
}
