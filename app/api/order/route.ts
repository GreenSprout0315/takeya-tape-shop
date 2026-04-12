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
import { sendOrderNotification } from "@/lib/email";
import { getNextQuoteNumber } from "@/lib/counter";
import { getSession } from "@/lib/auth";
import { getCustomerPriceMap } from "@/lib/customer-db";

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

    // 顧客マッチング & 見積生成（セッションからDB価格を取得）
    const session = await getSession();
    let dbPriceMap: Record<string, number> | null = null;
    if (session?.customerId) {
      dbPriceMap = await getCustomerPriceMap(session.customerId);
    }
    const quote = buildQuote(orderRequest, { dbPriceMap });

    // 見積番号（連番）を Vercel Blob の原子カウンターから採番
    //  失敗してもメール送信を止めないよう、エラーは捕捉する
    try {
      quote.quoteNumber = await getNextQuoteNumber();
      console.log("[ORDER] 連番採番成功", {
        requestId,
        id,
        quoteNumber: quote.quoteNumber,
      });
    } catch (err) {
      console.error("[ORDER] 連番採番失敗 (fallback to 未採番)", {
        requestId,
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // サーバーログ出力（Vercel Functions ログで確認可能）
    console.log("[ORDER RECEIVED]", {
      requestId,
      id,
      companyName: orderRequest.companyName,
      contactName: orderRequest.contactName,
      email: orderRequest.email,
      priceTier: quote.priceTier,
      sessionCustomerId: session?.customerId ?? null,
      lineCount: quote.lines.length,
      total: quote.total,
      elapsedMs: Date.now() - startedAt,
    });
    console.log(
      "[ORDER DETAIL]",
      JSON.stringify({ requestId, orderRequest, quote }, null, 2)
    );

    // 発注通知メール送信（Gmail SMTP 経由、社内通知＋お客様受付確認を並列送信）
    //  社内宛: s_miyamoto@greensprout0315.com, maki_kumabe@taketani.co.jp
    //  お客様宛: order.email
    // どちらかが失敗してもAPIレスポンスは成功として返す（顧客体験を壊さないため）
    const emailResult = await sendOrderNotification(orderRequest, quote);
    if (!emailResult.ok) {
      console.warn("[ORDER] email dispatch disabled (env vars missing)", {
        requestId,
        id,
      });
    } else {
      if (!emailResult.internal.ok) {
        console.warn("[ORDER] 社内通知メール送信失敗", {
          requestId,
          id,
          error:
            "error" in emailResult.internal
              ? emailResult.internal.error
              : undefined,
        });
      }
      if (!emailResult.customer.ok) {
        console.warn("[ORDER] 顧客受付確認メール送信失敗", {
          requestId,
          id,
          error:
            "error" in emailResult.customer
              ? emailResult.customer.error
              : undefined,
        });
      }
    }

    // TODO Phase C: Neon Postgres に永続化

    return NextResponse.json({
      ok: true,
      id,
      quote,
      emailSent:
        emailResult.ok &&
        (emailResult.internal.ok || emailResult.customer.ok),
      internalSent: emailResult.ok && emailResult.internal.ok,
      customerSent: emailResult.ok && emailResult.customer.ok,
      pdfAttached: emailResult.ok && emailResult.pdfAttached,
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
