import AprendizShell from "@/components/aprendiz/AprendizShell";

/**
 * Layout del módulo de Aprendiz adaptado a escritorio:
 * - Sidebar en pantallas grandes
 * - Topbar + contenido
 */
export default function AprendizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AprendizShell>{children}</AprendizShell>;
}
