/**
 * Inbox — avisos del navegador cuando entra un mensaje nuevo.
 *
 * Completa la fase 4 del diseño (INBOX_DISENO.md): el semáforo de retraso ya
 * avisa dentro de la pantalla, pero si nadie tiene el Inbox abierto no sirve de
 * nada. Esto lanza una notificación del sistema.
 *
 * La decisión de avisar está separada de la API del navegador para poder
 * probarla entera (`npm run test:inbox`).
 */

export const CLAVE_PREFERENCIA = "karuma.inbox.avisos";

export type EstadoAvisos = "activados" | "desactivados" | "bloqueados" | "no-soportado";

/**
 * ¿Hay que lanzar un aviso?
 *
 * Reglas, y el porqué de cada una:
 * - Solo cuando el contador SUBE: bajar significa que alguien ha contestado.
 * - Nunca en la primera lectura (`anterior === null`): al abrir la app ya se ve
 *   el número en la campana; avisar ahí sería ruido.
 * - Nunca con la pestaña a la vista: si estás mirando el Inbox, ya lo ves.
 * - Solo dentro del horario de atención: un aviso a las 4 de la mañana no lo
 *   va a atender nadie. El semáforo de retraso sí se sigue viendo siempre,
 *   porque eso es información en pantalla y no una interrupción.
 */
export function debeAvisar(input: {
  anterior: number | null;
  actual: number;
  visible: boolean;
  permiso: string;
  preferencia: boolean;
  enHorario: boolean;
}): boolean {
  if (!input.preferencia) return false;
  if (!input.enHorario) return false;
  if (input.permiso !== "granted") return false;
  if (input.visible) return false;
  if (input.anterior === null) return false;
  return input.actual > input.anterior;
}

/** Texto del aviso. Se separa para poder fijarlo con pruebas. */
export function textoAviso(nuevos: number, urgentes: number): { titulo: string; cuerpo: string } {
  const titulo =
    nuevos === 1 ? "Mensaje nuevo de un cliente" : `${nuevos} mensajes nuevos de clientes`;

  const cuerpo =
    urgentes > 0
      ? `${urgentes} ${urgentes === 1 ? "necesita" : "necesitan"} atención prioritaria`
      : "Sin responder en el Inbox de Karuma";

  return { titulo, cuerpo };
}

export function soportaAvisos(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function estadoAvisos(): EstadoAvisos {
  if (!soportaAvisos()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueados";
  if (Notification.permission !== "granted") return "desactivados";
  return preferenciaActiva() ? "activados" : "desactivados";
}

export function preferenciaActiva(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLAVE_PREFERENCIA) === "1";
}

export function guardarPreferencia(activa: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_PREFERENCIA, activa ? "1" : "0");
}

/**
 * Pide permiso al navegador. Se llama SIEMPRE desde un clic del usuario: los
 * navegadores penalizan (y Chrome directamente bloquea) las peticiones
 * automáticas al cargar la página.
 */
export async function pedirPermiso(): Promise<EstadoAvisos> {
  if (!soportaAvisos()) return "no-soportado";
  const permiso = await Notification.requestPermission();
  if (permiso === "denied") return "bloqueados";
  if (permiso !== "granted") return "desactivados";
  guardarPreferencia(true);
  return "activados";
}

/** Lanza el aviso. Al pulsarlo, lleva al Inbox. */
export function lanzarAviso(nuevos: number, urgentes: number): void {
  if (!soportaAvisos() || Notification.permission !== "granted") return;

  const { titulo, cuerpo } = textoAviso(nuevos, urgentes);
  try {
    const aviso = new Notification(titulo, {
      body: cuerpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Un solo aviso vivo a la vez: si entran tres mensajes seguidos no se
      // apilan tres burbujas, se reemplaza la anterior.
      tag: "karuma-inbox",
      renotify: true,
    } as NotificationOptions);

    aviso.onclick = () => {
      window.focus();
      window.location.href = "/mensajes";
      aviso.close();
    };
  } catch {
    /* algunos navegadores lanzan si no hay service worker: no es crítico */
  }
}
