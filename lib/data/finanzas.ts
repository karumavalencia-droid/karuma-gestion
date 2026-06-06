import { ResumenFinanzas } from "@/lib/types";

export const finanzasMes: ResumenFinanzas = {
  ingresos: 68420.35,
  gastos: 41250.80,
  beneficioEstimado: 27169.55,
  iva: 11893.54,
  comisionesDelivery: 3421.02,
};

export const desgloseIngresos = [
  { concepto: "Buffet sala", importe: 42180.00, porcentaje: 61.6 },
  { concepto: "Carta a la carta", importe: 12840.50, porcentaje: 18.8 },
  { concepto: "Uber Eats", importe: 6892.40, porcentaje: 10.1 },
  { concepto: "Glovo", importe: 4824.30, porcentaje: 7.1 },
  { concepto: "Just Eat", importe: 1683.15, porcentaje: 2.4 },
];

export const desgloseGastos = [
  { concepto: "Materia prima", importe: 22450.00 },
  { concepto: "Personal", importe: 11200.00 },
  { concepto: "Alquiler", importe: 3200.00 },
  { concepto: "Suministros", importe: 1850.80 },
  { concepto: "Marketing", importe: 980.00 },
  { concepto: "Comisiones delivery", importe: 3421.02 },
  { concepto: "Otros", importe: 1148.98 },
];
