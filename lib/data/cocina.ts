import { Receta, FichaCoste } from "@/lib/types";

export const recetas: Receta[] = [
  { id: "1", nombre: "Arroz sushi (batch)", categoria: "Sushi", porciones: 40, costePorcion: 0.42, tiempoMin: 45 },
  { id: "2", nombre: "California Roll", categoria: "Sushi", porciones: 8, costePorcion: 0.85, tiempoMin: 12 },
  { id: "3", nombre: "Nigiri Salmón", categoria: "Sushi", porciones: 10, costePorcion: 1.12, tiempoMin: 15 },
  { id: "4", nombre: "Pollo Teriyaki", categoria: "Rational", porciones: 12, costePorcion: 1.45, tiempoMin: 35 },
  { id: "5", nombre: "Muslo de pollo asado", categoria: "Rational", porciones: 15, costePorcion: 1.28, tiempoMin: 40 },
  { id: "6", nombre: "Sepia a la plancha", categoria: "Pira", porciones: 8, costePorcion: 2.10, tiempoMin: 18 },
  { id: "7", nombre: "Gambas al ajillo", categoria: "Pira", porciones: 6, costePorcion: 2.85, tiempoMin: 12 },
  { id: "8", nombre: "Tempura de gambas", categoria: "Otros", porciones: 10, costePorcion: 1.65, tiempoMin: 20 },
  { id: "9", nombre: "Gyozas caseras", categoria: "Otros", porciones: 20, costePorcion: 0.38, tiempoMin: 25 },
];

export const fichasCoste: FichaCoste[] = [
  { id: "1", plato: "Buffet Mediodía", costeTotal: 5.80, pvp: 16.95, margen: 65.8 },
  { id: "2", plato: "Buffet Noche", costeTotal: 7.20, pvp: 24.95, margen: 71.1 },
  { id: "3", plato: "California Roll", costeTotal: 2.40, pvp: 6.80, margen: 64.7 },
  { id: "4", plato: "Pollo Teriyaki", costeTotal: 3.10, pvp: 8.90, margen: 65.2 },
  { id: "5", plato: "Tempura Gambas", costeTotal: 2.85, pvp: 7.90, margen: 63.9 },
  { id: "6", plato: "Dragon Roll", costeTotal: 3.40, pvp: 9.50, margen: 64.2 },
];

export const equiposCocina = {
  rational: { modelo: "iCombi Pro 10-1/1", estado: "Operativo", ultimoMantenimiento: "15/05/2026" },
  pira: { modelo: "MEP 70 B", estado: "Operativo", ultimoMantenimiento: "22/04/2026" },
};
