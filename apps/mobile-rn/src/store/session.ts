import { create } from "zustand";
import { clearTokens, getAccessToken } from "../storage/tokens";
import * as Auth from "../api/auth";
import * as Turnos from "../api/turnos";

type SessionState = {
  isReady: boolean;
  user: Auth.Usuario | null;
  turno: Turnos.Turno | null;

  bootstrap: () => Promise<void>;
  signInGuarda: (p: {
    username: string;
    password: string;
    sede: Turnos.Sede;
    jornada: Turnos.Jornada;
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
      if (me.usuario.rol !== "guarda") {
        await clearTokens();
        set({ isReady: true, user: null, turno: null });
        return;
      }

      let turno: Turnos.Turno | null = null;
      const actual = await Turnos.turnoActual();
      if ((actual as any)?.activo === false) turno = null;
      else turno = actual as Turnos.Turno;

      set({ isReady: true, user: me.usuario, turno });
    } catch {
      await clearTokens();
      set({ isReady: true, user: null, turno: null });
    }
  },

  signInGuarda: async ({ username, password, sede, jornada }) => {
    // 1) token
    await Auth.login(username, password);

    // 2) me
    const me = await Auth.me();
    if (me.usuario.rol !== "guarda") {
      await clearTokens();
      throw new Error("Este usuario no es personal de seguridad (guarda).");
    }

    // 3) iniciar turno
    try {
      const r = await Turnos.iniciarTurno(sede, jornada);
      set({ user: me.usuario, turno: r.turno });
      return;
    } catch (e: any) {
      // Caso: ya tiene turno activo -> backend responde 400 con {turno}
      const data = e?.response?.data;
      if (data?.turno) {
        set({ user: me.usuario, turno: data.turno });
        return;
      }
      throw new Error(data?.motivo || "No se pudo iniciar el turno.");
    }
  },

  finalizarTurno: async () => {
    try {
      const r = await Turnos.finalizarTurno();
      set({ turno: r.turno });
    } catch {
      // si falla, no revientes la app; pero deja rastro para debug si quieres
    }
  },

  signOut: async () => {
    await clearTokens();
    set({ user: null, turno: null });
  },
}));
