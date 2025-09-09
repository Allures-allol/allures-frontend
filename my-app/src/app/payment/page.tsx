'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';

const currencyUAH = (v: number) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(v);

const TEST_AMOUNT_UAH = 20;
const MOCK = false; // увімкни true, якщо хочеш перевірити без бекенду

export default function PaymentTestPage() {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pageUrl, setPageUrl] = React.useState<string | null>(null);
  const [invoiceId, setInvoiceId] = React.useState<string | null>(null);

  const [amountUAH, setAmountUAH] = React.useState<number>(TEST_AMOUNT_UAH);
  const [description, setDescription] = React.useState<string>('Оплата замовлення');
  const [orderId, setOrderId] = React.useState<string>('ORDER-DEMO-1');

  const [email, setEmail] = React.useState<string>('test@example.com');

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Вираховуємо урли лише на клієнті, щоб не ловити гідрацію
  const RETURN_URL = React.useMemo(
    () => process.env.NEXT_PUBLIC_PAYMENT_RETURN_URL || (typeof window !== 'undefined' ? `${location.origin}/success` : ''),
    []
  );
  const FAIL_URL = React.useMemo(
    () => process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL || (typeof window !== 'undefined' ? `${location.origin}/payment-fail` : ''),
    []
  );
  const WEBHOOK_URL = React.useMemo(
    () => process.env.NEXT_PUBLIC_PAYMENT_WEBHOOK_URL || '',
    []
  );

  const createInvoice = async () => {
    setLoading(true);
    setErr(null);
    setPageUrl(null);
    setInvoiceId(null);

    try {
      if (!Number.isFinite(amountUAH) || Number(amountUAH) <= 0) {
        throw new Error('Будь ласка, вкажіть суму більше 0 ₴');
      }

      if (MOCK) {
        // --- МОК БЕЗ БЕКЕНДУ ---
        await new Promise((r) => setTimeout(r, 600));
        setPageUrl('https://api.monobank.ua/payments/invoice/test_page_url');
        setInvoiceId('TEST-INVOICE-123');
        setOpen(true);
        return;
      }

      // --- РЕАЛЬНИЙ ЗАПИТ: через локальний proxy-роут, щоб обійти CORS ---
      // Створи відповідний /src/app/payment/create/route.ts, який форвардить на бек https://api.alluresallol.com/payment
      const res = await fetch('/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', accept: 'application/json, text/plain, */*' },
        body: JSON.stringify({
          // минимальный набор
          amount_uah: Number(amountUAH),
          // для бэкендов, которые ещё ждут копійки:
          amount: Math.round(Number(amountUAH) * 100),
          order_id: orderId,
          email: email,
          display_type: 'iframe',
          currency: 'UAH',
          description: description,
        }),
      });

      if (!res.ok) {
        let detail = '';
        try {
          const j = await res.json();
          detail = j?.message || j?.statusText || '';
          if (j?.upstream) detail = `[upstream: ${j.upstream}] ` + detail;
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Payment proxy error payload:', j);
          }
        } catch {}
        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
      }
      const data = (await res.json()) as { pageUrl: string | null; invoiceId: string | null };

      setPageUrl(data.pageUrl);
      setInvoiceId(data.invoiceId);
      setOpen(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Create invoice failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Box
        sx={{
          width: 560,
          maxWidth: '100%',
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
          bgcolor: '#fff',
          boxShadow: '0 10px 30px rgba(0,0,0,.06)',
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0, mb: 1.5 }}>
          Тест оплати Mono
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>
            Сума:&nbsp;
            <b suppressHydrationWarning>
              {mounted ? currencyUAH(amountUAH) : `${amountUAH.toFixed(2)} UAH`}
            </b>
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Сума (UAH)"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              value={amountUAH}
              onChange={(e) => setAmountUAH(Number((e.target as HTMLInputElement).value))}
              fullWidth
            />
            <TextField
              label="Опис"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
            <TextField
              label="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
          </Stack>
        </Box>

        <Button
          variant="contained"
          size="large"
          onClick={createInvoice}
          disabled={!Number.isFinite(amountUAH) || Number(amountUAH) <= 0 || !email}
        >
          Оплатити Monobank (тест)
        </Button>

        {err && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <Typography variant="subtitle2" component="div">Помилка</Typography>
            <Typography variant="body2" component="div">{err}</Typography>
          </Alert>
        )}

        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
          <DialogTitle>Оплата Monobank (тест)</DialogTitle>
          <DialogContent>
            {!pageUrl ? (
              <>
                <Alert severity="warning">Апстрім не повернув пряму адресу платіжної сторінки. Спробуйте відкрити посилання нижче або повторіть спробу.</Alert>
                <Box sx={{ mt: 1.5 }}>
                  <Button variant="outlined" onClick={() => {
                    // Якщо проксі віддав raw з альтернативними полями — відкриємо їх у новій вкладці
                    // Оскільки raw лежить лише у відповіді проксі, а на клієнт ми віддали тільки pageUrl/invoiceId,
                    // запропонуємо повторний запит як кнопкою:
                    window.location.reload();
                  }}>
                    Оновити та спробувати ще раз
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Box
                  component="iframe"
                  title="monobank-payment"
                  src={pageUrl}
                  sx={{ width: '100%', height: 600, border: 0, borderRadius: 2, mt: 1 }}
                  allow="payment *; fullscreen *"
                />
                <Box sx={{ mt: 1.5 }}>
                  <Button variant="outlined" onClick={() => pageUrl && window.open(pageUrl, '_blank')}>
                    Відкрити у новій вкладці
                  </Button>
                </Box>
              </>
            )}
            <Typography sx={{ mt: 1.5 }} variant="caption" color="text.secondary">
              invoiceId: {invoiceId ?? '—'}
            </Typography>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
}