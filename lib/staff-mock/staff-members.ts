export interface StaffMember {
  id: string;
  nombre: string;
  rol: string;
  departamento: string;
  email: string;
  estado: "activo" | "inactivo";
}

export const staffMembers: StaffMember[] = [
  {
    id: "s1",
    nombre: "María García",
    rol: "Gerente",
    departamento: "Sala",
    email: "maria@karuma.es",
    estado: "activo",
  },
  {
    id: "s2",
    nombre: "Wei Lin",
    rol: "Chef",
    departamento: "Cocina",
    email: "wei@karuma.es",
    estado: "activo",
  },
  {
    id: "s3",
    nombre: "Carlos Ruiz",
    rol: "Camarero",
    departamento: "Sala",
    email: "carlos@karuma.es",
    estado: "activo",
  },
  {
    id: "s4",
    nombre: "Ana López",
    rol: "Caja",
    departamento: "Admin",
    email: "ana@karuma.es",
    estado: "inactivo",
  },
];
