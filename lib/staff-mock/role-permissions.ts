export interface RolePermission {
  id: string;
  rol: string;
  rolZh: string;
  descripcion: string;
  permisos: string[];
}

export const rolePermissions: RolePermission[] = [
  {
    id: "r1",
    rol: "Administrador",
    rolZh: "管理员",
    descripcion: "Acceso total al ERP",
    permisos: ["dashboard", "ventas", "inventario", "personal", "configuración"],
  },
  {
    id: "r2",
    rol: "Gerente",
    rolZh: "经理",
    descripcion: "Gestión operativa del restaurante",
    permisos: ["dashboard", "ventas", "food-cost", "personal", "horarios"],
  },
  {
    id: "r3",
    rol: "Chef",
    rolZh: "主厨",
    descripcion: "Cocina y recetas",
    permisos: ["recetas", "ingredientes", "inventario-cocina"],
  },
  {
    id: "r4",
    rol: "Empleado",
    rolZh: "员工",
    descripcion: "Consulta básica",
    permisos: ["horarios", "perfil"],
  },
];
