import { create } from "zustand";
import { clearTokens, getAccessToken } from "../storage/tokens";
import * as Auth from "../api/auth";
import * as Turnos from "../api/turnos";

type SessionState = {
  isReady: boolean;
  user: Auth.Usuario | null;
  turno: Turnos.Turno | null;

  bootstrap: () => Promise<void>;

  signIn: (p: {
    username: string;
    password: string;
    rol: "guarda" | "aprendiz";
    sede?: Turnos.Sede;
    jornada?: Turnos.Jornada;
  }) => Promise<void>;

  finalizarTurno: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  isReady: false,
  user: null,
  turno: null,

  bootstrap: async () => {
    try {
      const access = await getAccessToken();
      if (!access) {
        set({ isReady: true, user: null, turno: null });
        return;
      }

      const me = await Auth.me();

      // ✅ permitir guarda y aprendiz
      if (me.usuario.rol !== "guarda" && me.usuario.rol !== "aprendiz") {
        await clearTokens();
        set({ isReady: true, user: null, turno: null });
        return;
      }

      // guarda puede traer turno actual
      let turno: Turnos.Turno | null = null;
      if (me.usuario.rol === "guarda") {
        const actual = await Turnos.turnoActual();
        if ((actual as any)?.activo === false) turno = null;
        else turno = actual as Turnos.Turno;
      }

      set({ isReady: true, user: me.usuario, turno });
    } catch {
      await clearTokens();
      set({ isReady: true, user: null, turno: null });
    }
  },

  signIn: async ({ username, password, rol, sede, jornada }) => {
    // 1) token
    await Auth.login(username, password);

    // 2) me
    const me = await Auth.me();

    if (rol === "guarda" && me.usuario.rol !== "guarda") {
      await clearTokens();
      throw new Error("Este usuario no es personal de seguridad (guarda).");
    }
    if (rol === "aprendiz" && me.usuario.rol !== "aprendiz") {
      await clearTokens();
      throw new Error("Este usuario no es aprendiz.");
    }

    // 3) turno solo para guarda
    if (rol === "guarda") {
      if (!sede || !jornada) throw new Error("Selecciona sede y jornada.");
      try {
        const r = await Turnos.iniciarTurno(sede, jornada);
        set({ user: me.usuario, turno: r.turno });
        return;
      } catch (e: any) {
        const data = e?.response?.data;
        if (data?.turno) {
          set({ user: me.usuario, turno: data.turno });
          return;
        }
        throw new Error(data?.motivo || "No se pudo iniciar el turno.");
      }
    }

    // aprendiz
    set({ user: me.usuario, turno: null });
  },

  finalizarTurno: async () => {
    try {
      const r = await Turnos.finalizarTurno();
      set({ turno: r.turno });
    } catch {
      // no revientes
    }
  },

  signOut: async () => {
    await clearTokens();
    set({ user: null, turno: null });
  },
}));
