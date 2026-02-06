import Navbar from "@/components/Navbar";

/**
 * Layout de Administrador (desktop).
 * Mantiene el navbar superior y un contenedor amplio.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </>
  );
}
