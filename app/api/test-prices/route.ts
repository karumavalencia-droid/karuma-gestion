import { getCominportPrice } from "@/src/data/cominportPrices";
import * as cominportPricesModule from "@/src/data/cominportPrices";

export async function GET() {
  return Response.json({
    status: "ok",
    prices: {
      "201021": getCominportPrice("201021"),
      "200676": getCominportPrice("200676"),
      "203577": getCominportPrice("203577"),
      "999999": getCominportPrice("999999"),
    },
    totalPricesAvailable: Object.keys(cominportPricesModule).length,
  });
}
