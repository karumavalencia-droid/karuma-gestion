import type { CominportProduct } from "@/src/data/cominportProducts";

export interface CominportInvoiceMeta {
  unidadPedido: string;
  pedidosFactura: number;
  cantidadFactura: number;
}

const cominportInvoiceUsage: Record<string, CominportInvoiceMeta> = {
  "201021": { unidadPedido: "paquete/bolsa", pedidosFactura: 9, cantidadFactura: 52 },
  "200676": { unidadPedido: "paquete/bolsa", pedidosFactura: 8, cantidadFactura: 39 },
  "200191": { unidadPedido: "paquete/bolsa", pedidosFactura: 8, cantidadFactura: 27 },
  "203577": { unidadPedido: "botella", pedidosFactura: 7, cantidadFactura: 53 },
  "203726": { unidadPedido: "bandeja", pedidosFactura: 7, cantidadFactura: 40 },
  "201397": { unidadPedido: "tarrina", pedidosFactura: 7, cantidadFactura: 26 },
  "136750": { unidadPedido: "paquete/bolsa", pedidosFactura: 6, cantidadFactura: 36 },
  "202394": { unidadPedido: "bolsa", pedidosFactura: 4, cantidadFactura: 58 },
  "137200": { unidadPedido: "bolsa", pedidosFactura: 4, cantidadFactura: 13 },
  "160380": { unidadPedido: "caja", pedidosFactura: 4, cantidadFactura: 6 },
  "180050": { unidadPedido: "paquete", pedidosFactura: 4, cantidadFactura: 5 },
  "201370": { unidadPedido: "paquete", pedidosFactura: 3, cantidadFactura: 25 },
  "137700": { unidadPedido: "paquete/bolsa", pedidosFactura: 3, cantidadFactura: 14 },
  "204383": { unidadPedido: "pieza", pedidosFactura: 3, cantidadFactura: 13 },
  "182150": { unidadPedido: "paquete", pedidosFactura: 3, cantidadFactura: 13 },
  "201783": { unidadPedido: "bote", pedidosFactura: 3, cantidadFactura: 11 },
  "201647": { unidadPedido: "bolsa", pedidosFactura: 3, cantidadFactura: 4 },
  "201202": { unidadPedido: "bidon", pedidosFactura: 3, cantidadFactura: 4 },
  "136603": { unidadPedido: "pieza", pedidosFactura: 2, cantidadFactura: 21 },
  "136440": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 16 },
  "201198": { unidadPedido: "botella", pedidosFactura: 2, cantidadFactura: 12 },
  "202527": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 9 },
  "203310": { unidadPedido: "paquete/bolsa", pedidosFactura: 2, cantidadFactura: 7 },
  "140140": { unidadPedido: "paquete/bolsa", pedidosFactura: 2, cantidadFactura: 6 },
  "202711": { unidadPedido: "bolsa", pedidosFactura: 2, cantidadFactura: 6 },
  "202540": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 6 },
  "201785": { unidadPedido: "pack", pedidosFactura: 2, cantidadFactura: 5 },
  "204147": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 4 },
  "203686": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 4 },
  "201102": { unidadPedido: "paquete", pedidosFactura: 2, cantidadFactura: 2 },
  "201961": { unidadPedido: "bolsa/bote", pedidosFactura: 2, cantidadFactura: 2 },
  "200057": { unidadPedido: "lata/caja", pedidosFactura: 2, cantidadFactura: 2 },
  "203285": { unidadPedido: "caja", pedidosFactura: 2, cantidadFactura: 1 },
  "203774": { unidadPedido: "paquete/bolsa", pedidosFactura: 1, cantidadFactura: 20 },
  "201735": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 12 },
  "201132": { unidadPedido: "pieza", pedidosFactura: 1, cantidadFactura: 12 },
  "203766": { unidadPedido: "paquete/bolsa", pedidosFactura: 1, cantidadFactura: 10 },
  "201079": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 10 },
  "200841": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 10 },
  "201976": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 8 },
  "204529": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 6 },
  "200266": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 6 },
  "201859": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 5 },
  "205095": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 5 },
  "205097": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 5 },
  "203997": { unidadPedido: "bidon/bote", pedidosFactura: 1, cantidadFactura: 4 },
  "201483": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "204472": { unidadPedido: "paquete/bolsa", pedidosFactura: 1, cantidadFactura: 3 },
  "203668": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "201101": { unidadPedido: "paquete", pedidosFactura: 1, cantidadFactura: 3 },
  "201248": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "202544": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "201174": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "203759": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 3 },
  "200328": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 2 },
  "200015": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 2 },
  "200016": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 2 },
  "136090": { unidadPedido: "paquete/bolsa", pedidosFactura: 1, cantidadFactura: 2 },
  "204305": { unidadPedido: "saco", pedidosFactura: 1, cantidadFactura: 2 },
  "200329": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "200320": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "201051": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "201242": { unidadPedido: "saco", pedidosFactura: 1, cantidadFactura: 1 },
  "201794": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "201780": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "201047": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "200335": { unidadPedido: "paquete/bolsa", pedidosFactura: 1, cantidadFactura: 1 },
  "201040": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "201048": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
  "132050": { unidadPedido: "bidon", pedidosFactura: 1, cantidadFactura: 1 },
  "201245": { unidadPedido: "saco", pedidosFactura: 1, cantidadFactura: 1 },
  "135000": { unidadPedido: "bidon", pedidosFactura: 1, cantidadFactura: 1 },
  "201850": { unidadPedido: "caja", pedidosFactura: 1, cantidadFactura: 1 },
  "132110": { unidadPedido: "bidon", pedidosFactura: 1, cantidadFactura: 1 },
  "204703": { unidadPedido: "unidad", pedidosFactura: 1, cantidadFactura: 1 },
};

const cominportPriority = new Map(
  Object.keys(cominportInvoiceUsage).map((codigo, index) => [codigo, index]),
);

export function getCominportInvoiceMeta(codigo: string): CominportInvoiceMeta | undefined {
  return cominportInvoiceUsage[codigo];
}

export function rankCominportProducts(products: CominportProduct[]): CominportProduct[] {
  return [...products].sort((a, b) => {
    const aPriority = cominportPriority.get(a.codigo) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = cominportPriority.get(b.codigo) ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
}
