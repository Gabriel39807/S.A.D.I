"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";
import { useMe } from "@/hooks/useMe";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { me, loadingMe } = useMe();

  function logout() {
    clearTokens();
    router.replace("/login");
  }

  const isAdmin = pathname.startsWith("/admin");
  const isAprendiz = pathname.startsWith("/aprendiz");

  const nombreBonito =
    me?.first_name || me?.last_name
      ? `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim()
      : me?.username ?? "";

  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-4">
          <span className="font-bold">SADI</span>

                    {isAdmin && (
            <div className="flex items-center gap-3 text-sm">
              <Link className="hover:underline" href="/admin/usuarios">
                Usuarios
              </Link>
              <Link className="hover:underline" href="/admin/equipos">
                Equipos
              </Link>
              <Link className="hover:underline" href="/admin/accesos">
                Accesos
              </Link>
              <Link className="hover:underline" href="/admin/turnos">
                Turnos
              </Link>
            </div>
          )}

          {isAprendiz && (
            <div className="flex items-center gap-3 text-sm">
              <Link className="hover:underline" href="/aprendiz/inicio">
                Inicio
              </Link>
              <Link className="hover:underline" href="/aprendiz/equipos">
                Mis equipos
              </Link>
              <Link className="hover:underline" href="/aprendiz/accesos">
                Historial
              </Link>
              <Link className="hover:underline" href="/aprendiz/perfil">
                Mi perfil
              </Link>
              <Link className="hover:underline" href="/aprendiz/ayuda">
                Ayuda
              </Link>
            </div>
          )}
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">
              {loadingMe ? "Cargando..." : nombreBonito || "—"}
            </div>
            <div className="text-xs text-gray-500">
              {loadingMe ? "" : me?.rol ?? ""}
            </div>
          </div>

          <button
            onClick={logout}
            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
