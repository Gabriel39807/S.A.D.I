"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

type Acceso = {
  id: number;
  tipo: "ingreso" | "salida" | string;
  fecha: string; // ISO
  sede?: string | null;
  equipos?: number[]; // ids
};

type Equipo = {
  id: number;
  serial: string;
  marca: string;
  modelo: string;
};

function fmtFecha(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function badgeTipo(tipo: string) {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs border font-semibold";
  if (tipo === "ingreso") return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`;
  if (tipo === "salida") return `${base} bg-sky-50 text-sky-800 border-sky-200`;
  return `${base} bg-zinc-100 text-zinc-700 border-zinc-200`;
}

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function AprendizHistorialPage() {
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros (inspirados en el PDF: Entradas / Todos / Salidas + fecha)
  const [solo, setSolo] = useState<"todos" | "ingreso" | "salida">("todos");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const equiposById = useMemo(() => {
    const m = new Map<number, Equipo>();
    for (const e of equipos) m.set(e.id, e);
    return m;
  }, [equipos]);

  const tabs = [
    { key: "ingreso", label: "Entradas" },
    { key: "todos", label: "Todos" },
    { key: "salida", label: "Salidas" },
  ] as const;

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      // 1) Equipos (para mapear ids a serial)
      const equiposRes = await api.get("/api/equipos/");
      const equiposData = Array.isArray(equiposRes.data)
        ? equiposRes.data
        : equiposRes.data?.results ?? [];
      setEquipos(equiposData);

      // 2) Accesos con filtros (DRF: tipo, date_from, date_to)
      const params: any = {};
      if (solo !== "todos") params.tipo = solo;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const accesosRes = await api.get("/api/accesos/", { params });
      const data = Array.isArray(accesosRes.data)
        ? accesosRes.data
        : accesosRes.data?.results ?? [];
      setAccesos(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.message ??
        "No se pudo cargar el historial.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recargar al cambiar filtros (simple)
  useEffect(() => {
    // pequeña espera para evitar recargar de más al tipear fechas
    const t = setTimeout(() => cargar(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solo, dateFrom, dateTo]);

  const resumen = useMemo(() => {
    const entradas = accesos.filter((a) => a.tipo === "ingreso").length;
    const salidas = accesos.filter((a) => a.tipo === "salida").length;
    return { entradas, salidas, total: accesos.length };
  }, [accesos]);

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-900">
              Historial de ingresos / salidas
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Filtra por tipo y rango de fechas.
            </p>
          </div>

          <button
            onClick={cargar}
            className="rounded-full border px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Recargar
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="inline-flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setSolo(t.key)}
                className={cx(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  solo === t.key
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Fechas */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">Desde</span>
              <input
                type="date"
                className="rounded-xl border px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">Hasta</span>
              <input
                type="date"
                className="rounded-xl border px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Entradas</div>
            <div className="mt-1 text-2xl font-extrabold">{loading ? "—" : resumen.entradas}</div>
          </div>
          <div className="rounded-2xl border bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Salidas</div>
            <div className="mt-1 text-2xl font-extrabold">{loading ? "—" : resumen.salidas}</div>
          </div>
          <div className="rounded-2xl border bg-zinc-50 p-4">
            <div className="text-xs text-zinc-500">Total</div>
            <div className="mt-1 text-2xl font-extrabold">{loading ? "—" : resumen.total}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-auto rounded-3xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr className="text-left">
              <th className="p-4">Fecha</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Sede</th>
              <th className="p-4">Equipos</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-zinc-500" colSpan={4}>
                  Cargando historial...
                </td>
              </tr>
            )}

            {!loading && accesos.length === 0 && (
              <tr>
                <td className="p-4 text-zinc-500" colSpan={4}>
                  No hay registros para mostrar.
                </td>
              </tr>
            )}

            {!loading &&
              accesos.map((a) => {
                const equiposDesc = (a.equipos ?? [])
                  .map((id) => {
                    const e = equiposById.get(id);
                    return e ? e.serial : `#${id}`;
                  })
                  .join(", ");

                return (
                  <tr key={a.id} className="border-t">
                    <td className="p-4 whitespace-nowrap">{fmtFecha(a.fecha)}</td>
                    <td className="p-4">
                      <span className={badgeTipo(a.tipo)}>
                        {a.tipo === "ingreso" ? "Entrada" : a.tipo === "salida" ? "Salida" : a.tipo}
                      </span>
                    </td>
                    <td className="p-4">{a.sede ?? "—"}</td>
                    <td className="p-4">
                      <span className="text-zinc-700">
                        {equiposDesc || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
