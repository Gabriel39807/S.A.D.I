import { api } from "./client";

export type Notificacion = {
  id: number;
  tipo: "INFO" | "WARNING" | "URGENT";
  titulo: string;
  mensaje: string;
  data?: any;
  created_at: string;
  read_at: string | null;
};

export async function listar() {
  const r = await api.get("/api/notificaciones/");
  return r.data as Notificacion[];
}

export async function marcarLeida(id: number) {
  const r = await api.patch(`/api/notificaciones/${id}/leer/`);
  return r.data as any;
}
