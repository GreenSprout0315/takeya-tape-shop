import { NextResponse } from "next/server";
import { getOrderById, toOrderRequest, toQuote } from "@/lib/order-db";
import { generateEstimatePdf, generatePdfFilename } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await getOrderById(id);
  if (!row) {
    return NextResponse.json(
      { error: "該当する発注が見つかりません" },
      { status: 404 }
    );
  }

  const order = toOrderRequest(row);
  const quote = toQuote(row);
  const pdf = await generateEstimatePdf(order, quote);
  const filename = generatePdfFilename(quote.id);
  const encoded = encodeURIComponent(filename);

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
