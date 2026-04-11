/**
 * Counter — 原子的な連番カウンター
 *
 * Vercel Blob に JSON ファイルを置き、CAS (compare-and-swap) で
 * 競合を検出して再試行する形で実装。
 *
 * 使い方:
 * ```
 * const next = await getNextQuoteNumber();
 * // → 24200, 24201, 24202, ... と常に +1
 * ```
 *
 * 必要な環境変数: BLOB_READ_WRITE_TOKEN (Vercel Blob store にリンク済み)
 */

import {
  get,
  put,
  BlobNotFoundError,
} from "@vercel/blob";

const COUNTER_KEY = "counters/quote-number.txt";
const INITIAL_VALUE = 24200; // 初回発番
const MAX_RETRIES = 5;

type ReadResult = { value: number; etag: string } | null;

async function readCurrent(): Promise<ReadResult> {
  try {
    const result = await get(COUNTER_KEY, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const text = await new Response(result.stream).text();
    const value = parseInt(text.trim(), 10);
    if (!Number.isFinite(value)) {
      return null;
    }
    return { value, etag: result.blob.etag };
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return null;
    }
    throw err;
  }
}

async function writeCounter(value: number, ifMatch?: string): Promise<void> {
  await put(COUNTER_KEY, String(value), {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: 60, // 1分間だけキャッシュ
    ...(ifMatch ? { ifMatch } : {}),
  });
}

/**
 * 次の見積番号を原子的に採番する。
 * 競合が発生した場合は最大 MAX_RETRIES 回まで再試行する。
 */
export async function getNextQuoteNumber(): Promise<number> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const current = await readCurrent();
      const next = current ? current.value + 1 : INITIAL_VALUE;
      await writeCounter(next, current?.etag);
      return next;
    } catch (err) {
      // etag mismatch (他のリクエストがインクリメントした) → リトライ
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("precondition") ||
        msg.includes("etag") ||
        msg.toLowerCase().includes("conflict")
      ) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Counter update exceeded max retries");
}

/**
 * 現在のカウンター値を読むだけ（副作用なし）。
 * 管理・デバッグ用。
 */
export async function peekCounter(): Promise<number | null> {
  const current = await readCurrent();
  return current?.value ?? null;
}

/**
 * カウンターを明示的に初期化する（管理用）。
 * すでに値があってもこの数値で上書きする。
 */
export async function resetCounter(value: number): Promise<void> {
  const current = await readCurrent();
  await writeCounter(value, current?.etag);
}
