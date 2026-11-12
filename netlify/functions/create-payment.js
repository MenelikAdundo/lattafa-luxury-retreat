const crypto = require('crypto');
const {
  BookingValidationError,
  getPaystackMode,
  json,
  normalizeBooking
} = require('./lib/payment-utils');

const siteOrigin = event => {
  if (process.env.URL) return process.env.URL.replace(/\/$/, '');
  const host = String(event.headers?.host || '').replace(/[^a-z0-9.:-]/gi, '');
  return `https://${host}`;
};

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { message: 'Method not allowed.' });
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const mode = getPaystackMode(secretKey);
  if (!mode) return json(503, { message: 'Online payment setup is not available yet. Please choose pay at check-in or contact us on WhatsApp.' });

  try {
    if (String(event.body || '').length > 20000) throw new BookingValidationError('Booking details are too large.');
    const rawBooking = JSON.parse(event.body || '{}');
    if (mode === 'test' && rawBooking.test_mode_acknowledged !== 'true') {
      return json(503, { message: 'Online payments are in private test mode. Please choose pay at check-in.' });
    }
    const booking = normalizeBooking(rawBooking);
    const reference = `lattafa-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const callbackUrl = `${siteOrigin(event)}/payment-success.html`;
    const metadata = {
      room: booking.room,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guests: booking.guests,
      stay_type: booking.stayType,
      payment_option: booking.paymentOption,
      guest_name: booking.name,
      guest_email: booking.email,
      guest_phone: booking.phone,
      expected_amount: booking.amountSubunit,
      total_stay_amount: booking.total * 100,
      deposit_percentage: Math.round(booking.depositRate * 100),
      custom_fields: [
        { display_name: 'Accommodation', variable_name: 'accommodation', value: booking.roomName },
        { display_name: 'Stay dates', variable_name: 'stay_dates', value: `${booking.checkin} to ${booking.checkout}` }
      ]
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: booking.email,
        amount: booking.amountSubunit,
        currency: 'KES',
        reference,
        callback_url: callbackUrl,
        metadata
      })
    });
    const result = await response.json().catch(() => ({}));
    const link = result?.data?.authorization_url;
    if (!response.ok || !result?.status || !link) {
      return json(502, { message: result?.message || 'Paystack could not prepare secure checkout. Please try again.' });
    }
    return json(200, {
      link,
      reference,
      mode,
      amount: booking.amountDue,
      currency: 'KES',
      depositPercentage: booking.paymentOption === 'deposit' ? Math.round(booking.depositRate * 100) : null
    });
  } catch (error) {
    const status = error instanceof BookingValidationError || error instanceof SyntaxError ? 400 : 502;
    return json(status, { message: error.message || 'Unable to start secure payment.' });
  }
};
