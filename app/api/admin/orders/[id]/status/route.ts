import { NextResponse } from "next/server";
import { updateOrderStatus, getOrderById } from "@/lib/order-db";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/order";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "JSONが不正です" }, { status: 400 });
  }
  const status = body.status;
  if (!status || !(status in QUOTE_STATUS_LABELS)) {
    return NextResponse.json(
      { error: "ステータスが不正です" },
      { status: 400 }
    );
  }
  const existing = await getOrderById(id);
  if (!existing) {
    return NextResponse.json(
      { error: "該当する発注が見つかりません" },
      { status: 404 }
    );
  }
  await updateOrderStatus(id, status as QuoteStatus);
  return NextResponse.json({ ok: true });
}
