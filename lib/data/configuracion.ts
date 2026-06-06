import { DatosRestaurante, UsuarioSistema } from "@/lib/types";

export const datosRestaurante: DatosRestaurante = {
  nombre: "Karuma Sushi & Grill",
  direccion: "Calle Suecia, 15",
  ciudad: "46004 Valencia (Ruzafa)",
  telefono: "+34 963 123 456",
  cif: "B12345678",
  email: "info@karumasushi.es",
  horario: "L-J 12:00–16:00 / 20:00–23:30 · V-D 12:00–00:30",
};

export const usuarios: UsuarioSistema[] = [
  { id: "1", nombre: "María García", email: "maria@karumasushi.es", rol: "admin", activo: true },
  { id: "2", nombre: "Kenji Tanaka", email: "kenji@karumasushi.es", rol: "cocina", activo: true },
  { id: "3", nombre: "Carlos Ruiz", email: "carlos@karumasushi.es", rol: "cocina", activo: true },
  { id: "4", nombre: "Ana Belén Serrano", email: "ana@karumasushi.es", rol: "sala", activo: true },
  { id: "5", nombre: "David Fernández", email: "david@karumasushi.es", rol: "gerente", activo: true },
];

export const configuracionSistema = {
  idioma: "Español",
  zonaHoraria: "Europe/Madrid",
  moneda: "EUR (€)",
  notificaciones: {
    pedidosNuevos: true,
    stockBajo: true,
    resumenDiario: true,
    marketing: false,
  },
};
