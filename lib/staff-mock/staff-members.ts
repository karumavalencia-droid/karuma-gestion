export interface StaffMember {
  id: string;
  nombre: string;
  nombreZh: string;
  rol: string;
  departamento: string;
  email: string;
  estado: "activo" | "inactivo";
}

export const staffMembers: StaffMember[] = [
  {
    id: "s1",
    nombre: "María García",
    nombreZh: "玛丽亚",
    rol: "Gerente",
    departamento: "Sala",
    email: "maria@karuma.es",
    estado: "activo",
  },
  {
    id: "s2",
    nombre: "Wei Lin",
    nombreZh: "林伟",
    rol: "Chef",
    departamento: "Cocina",
    email: "wei@karuma.es",
    estado: "activo",
  },
  {
    id: "s3",
    nombre: "Carlos Ruiz",
    nombreZh: "卡洛斯",
    rol: "Camarero",
    departamento: "Sala",
    email: "carlos@karuma.es",
    estado: "activo",
  },
  {
    id: "s4",
    nombre: "Ana López",
    nombreZh: "安娜",
    rol: "Caja",
    departamento: "Admin",
    email: "ana@karuma.es",
    estado: "inactivo",
  },
];
