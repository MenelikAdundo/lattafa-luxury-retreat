const {
  BookingValidationError,
  getPaystackMode,
  json,
  verifyPaymentData
} = require('./lib/payment-utils');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { paid: false, message: 'Method not allowed.' });
  const reference = String(event.queryStringParameters?.reference || '').trim();
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!/^lattafa-\d{13}-[a-f0-9]{16}$/.test(reference) || !getPaystackMode(secretKey)) {
    return json(400, { paid: false, message: 'A valid payment reference is required.' });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.status) return json(400, { paid: false, message: 'Payment could not be verified.' });
    const booking = verifyPaymentData(result.data);
    return json(200, {
      paid: true,
      reference: booking.reference,
      amount: booking.amountDue,
      currency: 'KES',
      accommodation: booking.roomName,
      checkin: booking.checkin,
      checkout: booking.checkout,
      paymentOption: booking.paymentOption,
      message: 'Payment verified securely.'
    });
  } catch (error) {
    const status = error instanceof BookingValidationError ? 400 : 502;
    return json(status, { paid: false, message: error.message || 'Payment verification failed.' });
  }
};
