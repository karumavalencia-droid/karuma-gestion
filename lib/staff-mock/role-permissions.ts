export interface RolePermission {
  id: string;
  rol: string;
  descripcion: string;
  permisos: string[];
}

export const rolePermissions: RolePermission[] = [
  {
    id: "r1",
    rol: "Administrador",
    descripcion: "Acceso total al ERP",
    permisos: ["dashboard", "ventas", "inventario", "personal", "configuración"],
  },
  {
    id: "r2",
    rol: "Gerente",
    descripcion: "Gestión operativa del restaurante",
    permisos: ["dashboard", "ventas", "food-cost", "personal", "horarios"],
  },
  {
    id: "r3",
    rol: "Chef",
    descripcion: "Cocina y recetas",
    permisos: ["recetas", "ingredientes", "inventario-cocina"],
  },
  {
    id: "r4",
    rol: "Empleado",
    descripcion: "Consulta básica",
    permisos: ["horarios", "perfil"],
  },
];
