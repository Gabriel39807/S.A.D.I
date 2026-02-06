"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

type Equipo = {
  id: number;
  serial: string;
  marca: string;
  modelo: string;
  estado: "pendiente" | "aprobado" | "rechazado" | string;
  motivo_rechazo?: string | null;
  revisado_en?: string | null;
};

type Acceso = {
  id: number;
  tipo: "ingreso" | "salida" | string;
  fecha: string;
  equipos?: number[];
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function badgeEstado(estado: string) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  if (estado === "aprobado") return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  if (estado === "rechazado") return `${base} bg-red-50 text-red-800 border-red-200`;
  return `${base} bg-amber-50 text-amber-900 border-amber-200`;
}

function badgeUbicacion(ubi: "DENTRO" | "FUERA" | "SIN_REGISTROS") {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold";
  if (ubi === "DENTRO") return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  if (ubi === "FUERA") return `${base} bg-sky-50 text-sky-800 border-sky-200`;
  return `${base} bg-zinc-100 text-zinc-700 border-zinc-200`;
}

function ubicacionPorAccesos(equipoId: number, accesos: Acceso[]): "DENTRO" | "FUERA" | "SIN_REGISTROS" {
  for (const a of accesos) {
    if (!Array.isArray(a.equipos)) continue;
    if (!a.equipos.includes(equipoId)) continue;
    if (a.tipo === "ingreso") return "DENTRO";
    if (a.tipo === "salida") return "FUERA";
  }
  return "SIN_REGISTROS";
}

export default function AprendizEquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "pendiente" | "aprobado" | "rechazado"
  >("todos");

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [equiposRes, accesosRes] = await Promise.all([
        api.get("/api/equipos/"),
        api.get("/api/accesos/mis_accesos/"),
      ]);

      const equiposData = Array.isArray(equiposRes.data)
        ? equiposRes.data
        : equiposRes.data?.results ?? [];
      setEquipos(equiposData);

      const accesosData = Array.isArray(accesosRes.data)
        ? accesosRes.data
        : accesosRes.data?.results ?? [];
      setAccesos(accesosData);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ??
          e?.response?.data?.message ??
          "No se pudieron cargar tus equipos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    return equipos
      .filter((e) => {
        if (filtro !== "todos" && e.estado !== filtro) return false;
        if (!query) return true;
        return (
          (e.serial ?? "").toLowerCase().includes(query) ||
          (e.marca ?? "").toLowerCase().includes(query) ||
          (e.modelo ?? "").toLowerCase().includes(query)
        );
      })
      .map((e) => ({
        ...e,
        ubicacion: ubicacionPorAccesos(e.id, accesos),
      }));
  }, [equipos, accesos, filtro, q]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">Mis equipos</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Registra tu equipo antes de llegar al torniquete para evitar filas.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/aprendiz/equipos/nuevo"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Registrar nuevo
            </Link>
            <button
              onClick={cargar}
              className="rounded-full border px-5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Recargar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <input
            className="rounded-2xl border px-4 py-3 text-sm"
            placeholder="Buscar por serial, marca o modelo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-2xl border px-4 py-3 text-sm"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>

          <div className="rounded-2xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Total: <span className="font-semibold">{loading ? "—" : filtrados.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-zinc-500">Cargando equipos...</div>}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((e) => (
            <Link
              key={e.id}
              href={`/aprendiz/equipos/${e.id}`}
              className="rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold text-zinc-900">
                    {e.marca} {e.modelo}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">Serial: {e.serial}</div>
                </div>
                <span className={badgeEstado(e.estado)}>{e.estado}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={badgeUbicacion(e.ubicacion)}>
                  {e.ubicacion === "SIN_REGISTROS" ? "Sin movimientos" : e.ubicacion}
                </span>

                {e.estado === "rechazado" && e.motivo_rechazo && (
                  <span className="text-xs font-semibold text-red-700">
                    {e.motivo_rechazo}
                  </span>
                )}
              </div>

              <div className="mt-4 text-xs font-semibold text-emerald-700">
                Ver detalles →
              </div>
            </Link>
          ))}

          {filtrados.length === 0 && (
            <div className="sm:col-span-2 xl:col-span-3 rounded-3xl border bg-white p-6 text-sm text-zinc-600">
              No hay equipos para mostrar con los filtros actuales.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
