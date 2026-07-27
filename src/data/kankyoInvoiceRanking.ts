import type { CominportInvoiceMeta } from "@/src/data/cominportInvoiceRanking";
import type { CominportProduct } from "@/src/data/cominportProducts";

/**
 * Lo que Karuma ya ha comprado a Kankyo, leído de las facturas guardadas en
 * el backend de Facturas:
 *   · 20262600 · 26/05/2026 · 497,65 € · 13 líneas
 *   · 20262688 · 01/06/2026 · 532,57 € · 12 líneas
 *
 * `cantidadFactura` son cajas/packs facturados (todas las líneas iban a 1).
 * Al añadir facturas nuevas basta con actualizar este mapa.
 */
const kankyoInvoiceUsage: Record<string, CominportInvoiceMeta> = {
  // Pedido en las dos facturas
  HL05: { unidadPedido: "caja", pedidosFactura: 2, cantidadFactura: 2 },
  HL05TAPA: { unidadPedido: "caja", pedidosFactura: 2, cantidadFactura: 2 },

  // Factura 20262688 · 01/06/2026
  "18SS": { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "24": { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "61": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 1 },
  "65": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 1 },
  HL09: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  HL09TAPA: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  ZK001NEGRO: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "UK-AMONIX": { unidadPedido: "pack 2 garrafas", pedidosFactura: 1, cantidadFactura: 1 },
  "UK-BIOAL-F": { unidadPedido: "pack 2 garrafas", pedidosFactura: 1, cantidadFactura: 1 },
  "UK-PLAC": { unidadPedido: "pack 2 garrafas", pedidosFactura: 1, cantidadFactura: 1 },

  // Factura 20262600 · 26/05/2026
  HL01: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  HL01TAPA: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "107": { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "108": { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "146": { unidadPedido: "pack 3 u", pedidosFactura: 1, cantidadFactura: 1 },
  "148": { unidadPedido: "pack 6 rollos", pedidosFactura: 1, cantidadFactura: 1 },
  "151A": { unidadPedido: "pack 2 rollos", pedidosFactura: 1, cantidadFactura: 1 },
  "154": { unidadPedido: "caja 50 rollos", pedidosFactura: 1, cantidadFactura: 1 },
  PRAC138A: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  PRAC144: { unidadPedido: "pack 18 u", pedidosFactura: 1, cantidadFactura: 1 },
  PRAC160: { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
};

export function getKankyoInvoiceMeta(codigo: string): CominportInvoiceMeta | undefined {
  return kankyoInvoiceUsage[codigo];
}

export function rankKankyoProducts(products: CominportProduct[]): CominportProduct[] {
  return [...products].sort((a, b) => {
    const aMeta = getKankyoInvoiceMeta(a.codigo);
    const bMeta = getKankyoInvoiceMeta(b.codigo);

    if (aMeta && bMeta) {
      return (
        bMeta.pedidosFactura - aMeta.pedidosFactura ||
        bMeta.cantidadFactura - aMeta.cantidadFactura ||
        a.codigo.localeCompare(b.codigo)
      );
    }

    if (aMeta) return -1;
    if (bMeta) return 1;
    return 0;
  });
}
