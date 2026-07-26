import { cominportProducts } from "../src/data/cominportProducts";
import { jetExtramarProducts } from "../src/data/jetExtramarProducts";
import fs from "fs";
import path from "path";

interface ProductoInventario {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  proveedor: string;
  createdAt: number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const productos: ProductoInventario[] = [];

// Import Cominport products
cominportProducts.forEach((product) => {
  productos.push({
    id: generateId(),
    nombre: product.nombre,
    categoria: product.categoria || "Cominport",
    unidad: "unidad",
    stock: 0,
    stockMinimo: 2,
    precio: 0,
    proveedor: "Cominport",
    createdAt: Date.now(),
  });
});

// Import Jet Extramar products
jetExtramarProducts.forEach((product) => {
  productos.push({
    id: generateId(),
    nombre: product.nombre,
    categoria: product.categoria || "Jet Extramar",
    unidad: "kg",
    stock: 0,
    stockMinimo: 1,
    precio: 0,
    proveedor: "Jet Extramar",
    createdAt: Date.now(),
  });
});

// Save as JSON
const outputJson = path.join(__dirname, "../stock-import.json");
fs.writeFileSync(outputJson, JSON.stringify(productos, null, 2));

// Save as CSV for easy review
const outputCsv = path.join(__dirname, "../stock-import.csv");
const csvContent = [
  "ID,Nombre,Categoría,Unidad,Stock,Stock Mínimo,Precio,Proveedor",
  ...productos.map((p) =>
    [
      p.id,
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${p.categoria.replace(/"/g, '""')}"`,
      p.unidad,
      p.stock,
      p.stockMinimo,
      p.precio,
      p.proveedor,
    ].join(","),
  ),
].join("\n");
fs.writeFileSync(outputCsv, csvContent);

console.log(`✅ Importado ${productos.length} productos`);
console.log(`   Cominport: ${cominportProducts.length}`);
console.log(`   Jet Extramar: ${jetExtramarProducts.length}`);
console.log(`📁 JSON: ${outputJson}`);
console.log(`📊 CSV:  ${outputCsv}`);
