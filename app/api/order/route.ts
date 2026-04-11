/**
 * POST /api/order
 *
 * 発注フォームからの受信エンドポイント。
 * - OrderRequest を受け取り、バリデーション → Quote 生成
 * - 成功時はサーバーログに出力（Vercel Functions ログで確認可能）
 * - Phase B-next: Resend もしくは Gmail API でオーナーへメール送信
 */

import { NextResponse } from "next/server";
import {
  buildQuote,
  generateOrderId,
  validateOrderRequest,
  type OrderRequest,
} from "@/lib/order";
import { findCustomerByName } from "@/lib/customer-master";
import { sendOrderNotification } from "@/lib/email";

type RawOrderInput = Omit<OrderRequest, "id" | "receivedAt"> & {
  id?: string;
  receivedAt?: string;
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    let body: RawOrderInput;
    try {
      body = (await request.json()) as RawOrderInput;
    } catch (parseError) {
      console.warn("[ORDER] JSON parse failed", { requestId, parseError });
      return NextResponse.json(
        { ok: false, error: "リクエストボディの JSON 解析に失敗しました" },
        { status: 400 }
      );
    }

    // ID と receivedAt をサーバー側で採番
    const id = body.id || generateOrderId();
    const receivedAt = body.receivedAt || new Date().toISOString();

    const orderRequest: OrderRequest = {
      id,
      receivedAt,
      companyName: body.companyName ?? "",
      contactName: body.contactName ?? "",
      email: body.email ?? "",
      phone: body.phone,
      zipCode: body.zipCode,
      shippingAddress: body.shippingAddress,
      desiredDelivery: body.desiredDelivery,
      notes: body.notes,
      lines: body.lines ?? [],
    };

    // バリデーション
    const validation = validateOrderRequest(orderRequest);
    if (!validation.ok) {
      console.warn("[ORDER] validation failed", {
        requestId,
        id,
        errors: validation.errors,
      });
      return NextResponse.json(
        { ok: false, errors: validation.errors },
        { status: 422 }
      );
    }

    // 顧客マッチング & 見積生成
    const matchedCustomer = findCustomerByName(orderRequest.companyName);
    const quote = buildQuote(orderRequest, { matchedCustomer });

    // サーバーログ出力（Vercel Functions ログで確認可能）
    console.log("[ORDER RECEIVED]", {
      requestId,
      id,
      companyName: orderRequest.companyName,
      contactName: orderRequest.contactName,
      email: orderRequest.email,
      priceTier: quote.priceTier,
      matchedCustomer: matchedCustomer?.id,
      lineCount: quote.lines.length,
      total: quote.total,
      elapsedMs: Date.now() - startedAt,
    });
    console.log(
      "[ORDER DETAIL]",
      JSON.stringify({ requestId, orderRequest, quote }, null, 2)
    );

    // 発注通知メール送信（Resend 経由）
    //  - s_miyamoto@greensprout0315.com
    //  - maki_kumabe@taketani.co.jp
    // 失敗しても API レスポンスは成功として返す（顧客体験を壊さないため）
    const emailResult = await sendOrderNotification(orderRequest, quote);
    if (!emailResult.ok) {
      console.warn("[ORDER] email dispatch skipped or failed", {
        requestId,
        id,
        reason: emailResult.reason,
        error: "error" in emailResult ? emailResult.error : undefined,
      });
    }

    // TODO Phase C: Neon Postgres に永続化

    return NextResponse.json({
      ok: true,
      id,
      quote,
      emailSent: emailResult.ok,
    });
  } catch (error) {
    console.error("[ORDER] unexpected error", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { ok: false, error: "サーバー内部エラーが発生しました" },
      { status: 500 }
    );
  }
}
