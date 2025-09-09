import { NextRequest, NextResponse } from 'next/server';

// Force Node runtime (AbortController, env, etc.)
export const runtime = 'nodejs';
// Never cache this route
export const dynamic = 'force-dynamic';

// --- Helpers ---
const asInt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
};

const okJson = (data: any, init?: number | ResponseInit) =>
  NextResponse.json(data, {
    ...(typeof init === 'number' ? { status: init } : init),
    headers: {
      'Cache-Control': 'no-store',
      // Разрешаем дергать с других доменов при необходимости (если будешь вызывать не с этого хоста)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

// Нормализация pageUrl / invoiceId из разных ответов бекенда
function normalizeUpstream(data: any) {
  const pageUrl = data?.pageUrl ?? data?.page_url ?? data?.checkout_url ?? data?.payment_url ?? data?.url ?? null;
  const invoiceId = data?.invoiceId ?? data?.invoice_id ?? data?.id ?? data?.invoice ?? null;
  return { pageUrl, invoiceId };
}

// OPTIONS для CORS preflight (если когда-то будет нужен для другого домена)
export async function OPTIONS() {
  return okJson({ ok: true });
}

/**
 * POST /payment/create
 * Прокси на бекенд-ендпоинт оплаты (моно/инше). Вызывается с фронта как fetch('/payment/create').
 * Переносит нужные поля, добавляет дефолты и токен при необходимости.
 */
export async function POST(req: NextRequest) {
  try {
    const input = (await req.json().catch(() => ({}))) as Record<string, any>;

    // --- Валидируем и заполняем дефолты ---
    const provider = (input.provider || 'monobank').toString();

    // Разрешим 2 варианта суммы: amount (в копійках) ИЛИ amountUAH (в гривне, мы переведем в копійки)
    const amountMinor = asInt(
      input.amount != null ? input.amount : input.amountUAH != null ? Math.round(Number(input.amountUAH) * 100) : null,
    );

    if (amountMinor == null || amountMinor <= 0) {
      return okJson({ error: true, message: 'Invalid amount. Expect minor units (копійки) > 0' }, 400);
    }

    // NOTE: Якщо бек очікує інший формат тіла — передайте його як `upstreamPayload` у POST, тоді цей payload буде замінений.
    const payload = {
      provider, // 'monobank' по умолчанию
      amount: amountMinor, // копійки
      currency: input.currency || 'UAH',
      orderId: input.orderId || `ORDER-${Date.now()}`,
      description: input.description || 'Оплата замовлення',
      displayType: input.displayType || 'iframe',
      returnUrl: input.returnUrl || process.env.NEXT_PUBLIC_PAYMENT_RETURN_URL || undefined,
      failUrl: input.failUrl || process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL || undefined,
      webhookUrl: input.webhookUrl || process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL || undefined,
      customer: input.customer || undefined, // { email, phone, name } — если пришло, отдадим как есть
      meta: input.meta || undefined,
    };

    // Якщо прийшов готовий тіла від фронта — прокинемо його як є (для нестандартних провайдерів)
    const bodyToSend = input.upstreamPayload && typeof input.upstreamPayload === 'object' ? input.upstreamPayload : payload;

    // --- Настройка апстрима ---
    const upstream = process.env.PAYMENT_UPSTREAM_URL || 'https://api.alluresallol.com/payment';
    const isDev = process.env.NODE_ENV !== 'production';
    const echoPayload = { ...payload };

    const headers: Record<string, string> = {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
    };
    // Сервисный токен (если бек требует авторизацию)
    const token = process.env.PAYMENT_API_TOKEN;
    if (token) headers.authorization = `Bearer ${token}`;

    // --- Таймаут и запрос ---
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PAYMENT_TIMEOUT_MS || 12000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyToSend),
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') {
        return okJson({ error: true, message: `Upstream timeout after ${timeoutMs}ms` }, 504);
      }
      return okJson({ error: true, message: e?.message || 'Upstream fetch failed' }, 502);
    }
    clearTimeout(timer);

    const rawText = await upstreamRes.text();

    if (!upstreamRes.ok) {
      // Пробросим часть тела ошибки, чтобы видеть причину (CORS/валидация и т.д.)
      return okJson(
        {
          error: true,
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          upstream,
          // покажем кусок тела, чтобы видеть причину от апстрима
          message: rawText.slice(0, 2000),
          // в дев-режиме отдадим полезный контекст
          ...(isDev ? { sentPayload: echoPayload, receivedHeaders: Object.fromEntries(upstreamRes.headers.entries()) } : {}),
        },
        502,
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Если вернулся не JSON (редко), вернем как текст
      parsed = { raw: rawText };
    }

    const { pageUrl, invoiceId } = normalizeUpstream(parsed);

    // Минимальная проверка
    if (!pageUrl) {
      return okJson({ error: true, message: 'Upstream did not return pageUrl', raw: parsed }, 502);
    }

    return okJson({ pageUrl, invoiceId, raw: isDev ? parsed : undefined, upstream });
  } catch (e: any) {
    return okJson({ error: true, message: e?.message || 'Payment proxy failed' }, 500);
  }
}