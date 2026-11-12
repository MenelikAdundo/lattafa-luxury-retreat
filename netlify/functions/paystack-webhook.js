const crypto = require('crypto');
const {
  getPaystackMode,
  json,
  verifyPaymentData
} = require('./lib/payment-utils');

const signaturesMatch = (body, signature, secret) => {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', secret).update(body).digest('hex');
  const received = Buffer.from(signature, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');
  return received.length === calculated.length && crypto.timingSafeEqual(received, calculated);
};

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed.' });
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!getPaystackMode(secretKey)) return json(503, { message: 'Payment webhook is not configured.' });
  const rawBody = event.body || '';
  const signature = event.headers?.['x-paystack-signature'] || event.headers?.['X-Paystack-Signature'];
  if (!signaturesMatch(rawBody, signature, secretKey)) return json(401, { message: 'Invalid webhook signature.' });

  try {
    const notification = JSON.parse(rawBody);
    if (notification.event !== 'charge.success') return json(200, { received: true });

    const reference = String(notification.data?.reference || '');
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.status) return json(502, { message: 'Payment verification failed.' });
    const booking = verifyPaymentData(result.data);

    const origin = (process.env.URL || '').replace(/\/$/, '');
    if (origin) {
      const form = new URLSearchParams({
        'form-name': 'payment-confirmation',
        reference: booking.reference,
        payment_status: 'verified',
        amount: `KSh ${booking.amountDue}`,
        payment_option: booking.paymentOption,
        accommodation: booking.roomName,
        checkin: booking.checkin,
        checkout: booking.checkout,
        guest_name: booking.name,
        guest_email: booking.email,
        guest_phone: booking.phone
      });
      const saved = await fetch(`${origin}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      if (!saved.ok) return json(502, { message: 'Payment was verified but its notification could not be saved.' });
    }
    return json(200, { received: true, verified: true });
  } catch {
    return json(400, { message: 'Webhook payload is invalid.' });
  }
};
