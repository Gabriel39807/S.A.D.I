"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { useMe } from "@/hooks/useMe";

type Equipo = {
  id: number;
  serial: string;
  marca: string;
  modelo: string;
  estado: "pendiente" | "aprobado" | "rechazado" | string;
  motivo_rechazo?: string | null;
};

type Acceso = {
  id: number;
  tipo: "ingreso" | "salida" | string;
  fecha: string; // ISO
  sede?: string | null;
  equipos?: number[];
};

type EstadoResponse = {
  estado?: "DENTRO" | "FUERA" | "SIN_REGISTROS";
  ultimo_tipo?: "ingreso" | "salida" | null;
  ultima_fecha?: string | null;
};

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function badgeEstadoEquipo(estado: string) {
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

/**
 * Determina (aprox.) si un equipo está dentro/fuera según el último acceso
 * que lo incluya.
 */
function ubicacionPorAccesos(equipoId: number, accesos: Acceso[]): "DENTRO" | "FUERA" | "SIN_REGISTROS" {
  for (const a of accesos) {
    if (!Array.isArray(a.equipos)) continue;
    if (!a.equipos.includes(equipoId)) continue;
    if (a.tipo === "ingreso") return "DENTRO";
    if (a.tipo === "salida") return "FUERA";
  }
  return "SIN_REGISTROS";
}

export default function AprendizInicioPage() {
  const { me, loadingMe } = useMe();

  const [estado, setEstado] = useState<EstadoResponse | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [accesos, setAccesos] = useState<Acceso[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      const [estadoRes, equiposRes, accesosRes] = await Promise.all([
        api.get<EstadoResponse>("/api/accesos/estado/"),
        api.get("/api/equipos/"),
        api.get("/api/accesos/mis_accesos/"),
      ]);

      setEstado(estadoRes.data);

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
          "No se pudo cargar tu panel."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const stats = useMemo(() => {
    const total = equipos.length;
    const aprobados = equipos.filter((e) => e.estado === "aprobado").length;
    const pendientes = equipos.filter((e) => e.estado === "pendiente").length;
    const rechazados = equipos.filter((e) => e.estado === "rechazado").length;

    const ultimoAcceso = accesos[0];

    return {
      total,
      aprobados,
      pendientes,
      rechazados,
      ultimoAcceso,
    };
  }, [equipos, accesos]);

  const equiposPreview = useMemo(() => equipos.slice(0, 4), [equipos]);
  const accesosPreview = useMemo(() => accesos.slice(0, 5), [accesos]);

  const nombreBonito =
    me?.first_name || me?.last_name
      ? `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim()
      : me?.username ?? "";

  return (
    <div className="space-y-6">
      {/* HEADER DE INFO */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold tracking-wide text-emerald-700">
                Panel Aprendiz
              </div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900">
                {loadingMe ? "Cargando..." : nombreBonito || "—"}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {me?.programa_formacion ?? ""}
                {me?.sede_principal ? ` • ${me.sede_principal}` : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold",
                  estado?.estado === "DENTRO" &&
                    "bg-emerald-50 text-emerald-800 border-emerald-200",
                  estado?.estado === "FUERA" && "bg-sky-50 text-sky-800 border-sky-200",
                  (!estado?.estado || estado?.estado === "SIN_REGISTROS") &&
                    "bg-zinc-100 text-zinc-700 border-zinc-200"
                )}
              >
                Estado actual: {estado?.estado ?? "SIN REGISTROS"}
              </span>

              <div className="text-xs text-zinc-500">
                Último registro: {fmt(estado?.ultima_fecha)}
              </div>

              <button
                onClick={cargar}
                className="rounded-full border px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Recargar
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Equipos registrados</div>
              <div className="mt-1 text-2xl font-extrabold">
                {loading ? "—" : stats.total}
              </div>
            </div>
            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Aprobados</div>
              <div className="mt-1 text-2xl font-extrabold">
                {loading ? "—" : stats.aprobados}
              </div>
            </div>
            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Pendientes</div>
              <div className="mt-1 text-2xl font-extrabold">
                {loading ? "—" : stats.pendientes}
              </div>
            </div>
            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Rechazados</div>
              <div className="mt-1 text-2xl font-extrabold">
                {loading ? "—" : stats.rechazados}
              </div>
            </div>
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-zinc-900">Accesos rápidos</h3>
          <div className="mt-4 grid gap-3">
            <Link
              href="/aprendiz/equipos/nuevo"
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Registrar nuevo equipo
            </Link>
            <Link
              href="/aprendiz/accesos"
              className="rounded-2xl border px-4 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Historial de ingresos
            </Link>
            <Link
              href="/aprendiz/ayuda"
              className="rounded-2xl border px-4 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Ayuda y soporte
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border bg-zinc-50 p-4 text-xs text-zinc-600">
            <span className="font-semibold text-zinc-900">Importante:</span> recuerda
            registrar tu salida al finalizar el turno.
          </div>
        </div>
      </div>

      {/* MIS EQUIPOS */}
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-extrabold text-zinc-900">Mis equipos</h3>
          <Link
            href="/aprendiz/equipos"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && (
            <div className="col-span-full text-sm text-zinc-500">Cargando equipos...</div>
          )}

          {!loading && equiposPreview.length === 0 && (
            <div className="col-span-full rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-600">
              Aún no tienes equipos registrados.
              <Link href="/aprendiz/equipos/nuevo" className="ml-2 font-semibold text-emerald-700 hover:underline">
                Registrar uno
              </Link>
            </div>
          )}

          {!loading &&
            equiposPreview.map((eq) => {
              const ubi = ubicacionPorAccesos(eq.id, accesos);
              return (
                <Link
                  key={eq.id}
                  href={`/aprendiz/equipos/${eq.id}`}
                  className="group rounded-2xl border bg-white p-4 transition hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-zinc-900">
                        {eq.marca} {eq.modelo}
                      </div>
                      <div className="mt-1 truncate text-xs text-zinc-500">
                        Serial: {eq.serial}
                      </div>
                    </div>
                    <span className={badgeEstadoEquipo(eq.estado)}>{eq.estado}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={badgeUbicacion(ubi)}>
                      {ubi === "SIN_REGISTROS" ? "Sin movimientos" : ubi}
                    </span>
                    {eq.estado === "rechazado" && eq.motivo_rechazo && (
                      <span className="text-xs text-red-700">{eq.motivo_rechazo}</span>
                    )}
                  </div>

                  <div className="mt-3 text-xs font-semibold text-emerald-700 opacity-0 transition group-hover:opacity-100">
                    Ver detalles →
                  </div>
                </Link>
              );
            })}
        </div>
      </div>

      {/* NOTIFICACIONES */}
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-zinc-900">Notificaciones recientes</h3>
          <Link
            href="/aprendiz/accesos"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            Ver historial
          </Link>
        </div>

        <div className="mt-4 grid gap-3">
          {!loading && accesosPreview.length === 0 && (
            <div className="rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-600">
              Aún no hay registros de ingreso/salida.
            </div>
          )}

          {accesosPreview.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-zinc-900">
                  {a.tipo === "ingreso" ? "Ingreso registrado" : "Salida registrada"}
                </div>
                <div className="text-xs text-zinc-500">{fmt(a.fecha)}</div>
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                {a.sede ? `Sede: ${a.sede}` : ""}
              </div>
            </div>
          ))}

          <div className="rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-700">
            <span className="font-semibold">Anuncio general:</span> recuerda actualizar
            tus datos personales en la sección de perfil.
          </div>
        </div>
      </div>
    </div>
  );
}
