/**
 * Precios reales de productos Cominport.
 * Extraídos de las facturas FV26030657–FV26041093 (abril–junio 2026),
 * PDFs de pedidos.alicante@cominport.com. Precio unitario neto más reciente.
 */
export const cominportPrices: Record<string, number> = {
  "100980": 19.5,
  "136090": 8.75,
  "136440": 19.0,
  "136603": 7.85,
  "136750": 1.75,
  "137200": 2.85,
  "137700": 7.85,
  "140140": 7.25,
  "160380": 22.5,
  "180050": 8.95,
  "182150": 3.75,
  "200015": 1.65,
  "200016": 2.25,
  "200191": 4.75,
  "200264": 4.75,
  "200266": 6.75,
  "200320": 27.0,
  "200328": 82.0,
  "200329": 82.0,
  "200676": 5.1,
  "200841": 2.15,
  "201021": 11.5,
  "201047": 25.5,
  "201051": 18.5,
  "201079": 2.95,
  "201101": 4.65,
  "201102": 35.5,
  "201132": 7.25,
  "201198": 4.65,
  "201202": 25.0,
  "201242": 32.5,
  "201248": 7.85,
  "201370": 6.85,
  "201397": 18.5,
  "201483": 3.37,
  "201647": 26.85,
  "201780": 12.85,
  "201783": 4.85,
  "201785": 4.88,
  "201794": 14.75,
  "201859": 1.15,
  "201976": 10.0,
  "202394": 3.95,
  "202527": 3.85,
  "202711": 17.5,
  "203285": 22.5,
  "203310": 3.25,
  "203577": 5.5,
  "203668": 3.65,
  "203686": 4.65,
  "203726": 5.25,
  "203766": 8.5,
  "204147": 4.65,
  "204383": 10.85,
  "204472": 6.4,
  "204529": 1.7,
  "204638": 4.75,
};

export function getCominportPrice(codigo: string): number | undefined {
  return cominportPrices[codigo];
}

export function getProductWithPrice(
  product: { codigo: string; nombre: string; categoria: string; formato: string }
) {
  return {
    ...product,
    precio: getCominportPrice(product.codigo),
  };
}
