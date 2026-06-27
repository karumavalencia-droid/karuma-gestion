export type EstadoProducto = "activo" | "inactivo";

export type EstadoInventario = "correcto" | "bajo" | "critico";

export type EstadoEmpleado = "activo" | "vacaciones" | "baja";

export type AreaTurno = "cocina" | "sala" | "barra";

export type CanalPedido = "Mesa" | "Uber Eats" | "Glovo" | "Just Eat" | "Teléfono";

export type EstadoPedido = "pendiente" | "preparando" | "listo" | "entregado";

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  estado: EstadoProducto;
}

export interface ItemInventario {
  id: string;
  producto: string;
  categoria: string;
  stockActual: number;
  unidad: string;
  stockMinimo: number;
  estado: EstadoInventario;
}

export type EstadoProductoInventario = "correcto" | "bajo" | "agotado";

export interface ProductoInventario {
  id: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
  precio: number;
  proveedor: string;
  createdAt?: number;
}

export interface MovimientoInventario {
  id: string;
  productId: string;
  productName: string;
  type: "entrada" | "salida";
  qty: number;
  note: string;
  ts: number;
}

export interface ItemProduccion {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  objetivo: number;
  ultimaActualizacion: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  puesto: string;
  telefono: string;
  fechaEntrada: string;
  estado: EstadoEmpleado;
  horasMes: number;
  sueldoEstimado: number;
}

export type DiaSemana =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";

export interface HorarioDia {
  turnoComida: string;
  turnoCena: string;
  horas: number;
}

export interface EmpleadoPersonal {
  id: string;
  nombre: string;
  cargo: string;
  telefono: string;
  fechaAlta: string;
  salarioBase: number;
  estado: EstadoEmpleado;
  horario: Record<DiaSemana, HorarioDia>;
}

export interface Turno {
  id: string;
  empleado: string;
  area: AreaTurno;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface Pedido {
  id: string;
  canal: CanalPedido;
  estado: EstadoPedido;
  total: number;
  hora: string;
  detalle?: string;
}

export interface PedidoDelivery {
  id: string;
  plataforma: "Uber Eats" | "Glovo";
  hora: string;
  importe: number;
  estado: "entregado" | "en camino" | "preparando";
}

export interface Compra {
  id: string;
  proveedor: string;
  producto: string;
  cantidad: number;
  unidad: string;
  importe: number;
  fecha: string;
}

export type EstadoProveedor = "activo" | "inactivo";

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  categoria: string;
  estado: EstadoProveedor;
}

export type EstadoPedidoCompra = "pendiente" | "enviado" | "recibido" | "cancelado";

export interface PedidoCompra {
  id: string;
  numeroPedido: string;
  fecha: string;
  proveedorId: string;
  proveedorNombre: string;
  producto: string;
  cantidad: number;
  unidad: string;
  coste: number;
  estado: EstadoPedidoCompra;
}

export interface ComprasStore {
  proveedores: Proveedor[];
  pedidos: PedidoCompra[];
  contadorPedido: number;
}

export interface ProductoVendido {
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface AlertaInventario {
  producto: string;
  stockActual: number;
  stockMinimo: number;
  nivel: "bajo" | "critico";
}

export interface AlertaImportante {
  id: string;
  tipo: "inventario" | "pedido" | "personal" | "finanzas";
  mensaje: string;
  prioridad: "alta" | "media";
}

export interface ResumenFinanzas {
  ingresos: number;
  gastos: number;
  beneficioEstimado: number;
  iva: number;
  comisionesDelivery: number;
}

export interface Promocion {
  id: string;
  nombre: string;
  descuento: string;
  vigencia: string;
  estado: "activa" | "programada" | "finalizada";
}

export interface CanalMarketing {
  canal: string;
  inversion: number;
  conversiones: number;
  roi: number;
}

export interface Receta {
  id: string;
  nombre: string;
  categoria: "Rational" | "Pira" | "Sushi" | "Otros";
  porciones: number;
  costePorcion: number;
  tiempoMin: number;
}

export interface FichaCoste {
  id: string;
  plato: string;
  costeTotal: number;
  pvp: number;
  margen: number;
}

export interface UsuarioSistema {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "gerente" | "cocina" | "sala";
  activo: boolean;
}

export interface DatosRestaurante {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  cif: string;
  email: string;
  horario: string;
}

export interface RegistroRestosuite {
  id: string;
  fecha: string;
  ventas: number;
  clientes: number;
  ticketMedio: number;
  facturas: number;
  ventasBebida: number;
  observaciones: string;
}

export interface RestosuiteStore {
  objetivoMensual: number;
  registros: RegistroRestosuite[];
}

/** @deprecated Usar RegistroRestosuite */
export type RegistroDiario = RegistroRestosuite;

/** @deprecated Usar RestosuiteStore */
export type ObjetivoStore = RestosuiteStore;

export interface RegistroProfit {
  id: string;
  mes: string;
  ventas: number;
  compras: number;
  personal: number;
  alquiler: number;
  suministros: number;
  gestoria: number;
  otros: number;
}

export interface ProfitStore {
  registros: RegistroProfit[];
}

export type PlataformaReview = "Google" | "TripAdvisor" | "TheFork";

export interface ResenaReview {
  id: string;
  fecha: string;
  autor: string;
  rating: number;
  texto: string;
  plataforma: PlataformaReview;
  respondida: boolean;
  respuesta?: string;
}

export interface RegistroMensualReviews {
  id: string;
  mes: string;
  totalResenas: number;
  rating: number;
  nuevasResenas: number;
  positivas: number;
  negativas: number;
  pendientesRespuesta: number;
}

export interface ReviewsStore {
  objetivoResenas: number;
  ratingActual: number;
  totalResenas: number;
  registrosMensuales: RegistroMensualReviews[];
  resenas: ResenaReview[];
}

export type PlataformaDeliveryCenter = "Uber Eats" | "Glovo";

export type EstadoPedidoDelivery = "entregado" | "en camino" | "preparando" | "cancelado";

export interface PedidoDeliveryCenter {
  id: string;
  fecha: string;
  plataforma: PlataformaDeliveryCenter;
  importe: number;
  estado: EstadoPedidoDelivery;
}

export interface RegistroDeliveryMes {
  id: string;
  mes: string;
  ventasUber: number;
  ventasGlovo: number;
  pedidosUber: number;
  pedidosGlovo: number;
}

export interface DeliveryStore {
  comisionUberPct: number;
  comisionGlovoPct: number;
  costeComidaPct: number;
  registros: RegistroDeliveryMes[];
  pedidos: PedidoDeliveryCenter[];
}

export interface RegistroFoodCost {
  id: string;
  mes: string;
  ventas: number;
  clientes: number;
  compras: number;
}

export interface FoodCostStore {
  objetivoFoodCostPct: number;
  registros: RegistroFoodCost[];
}

export type CategoriaFactura =
  | "Factura"
  | "Pescado"
  | "Carne"
  | "Verdura"
  | "Arroz"
  | "Bebidas"
  | "Limpieza"
  | "Packaging"
  | "Otros";

export interface Factura {
  id: string;
  fecha: string;
  proveedor: string;
  importe: number;
  categoria: CategoriaFactura;
  observaciones: string;
  archivoNombre: string;
  archivoTipo: string;
  archivoData: string;
  archivoPath?: string;
  archivoUrl?: string;
  archivoSource?: "upload" | "google-drive" | "legacy";
  driveFileId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface FacturasStore {
  facturas: Factura[];
}
