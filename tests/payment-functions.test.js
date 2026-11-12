const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBooking, verifyPaymentData } = require('../netlify/functions/lib/payment-utils');
const createPayment = require('../netlify/functions/create-payment').handler;
const verifyPayment = require('../netlify/functions/verify-payment').handler;
const paymentStatus = require('../netlify/functions/payment-status').handler;

const futureDate = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const baseBooking = overrides => ({
  room: '1-bedroom-suite',
  checkin: futureDate(3),
  checkout: futureDate(5),
  name: 'Test Guest',
  email: 'guest@example.com',
  phone: '+254700000000',
  guests: '2',
  stay_type: 'Leisure stay',
  payment_option: 'deposit',
  test_mode_acknowledged: 'true',
  ...overrides
});

test('calculates policy-aligned deposit amounts', () => {
  const standard = normalizeBooking(baseBooking());
  assert.equal(standard.total, 6000);
  assert.equal(standard.depositRate, 0.3);
  assert.equal(standard.amountDue, 1800);

  const compound = normalizeBooking(baseBooking({ room: 'whole-compound' }));
  assert.equal(compound.total, 30000);
  assert.equal(compound.depositRate, 0.5);
  assert.equal(compound.amountDue, 15000);
});

test('rejects past and malformed booking dates', () => {
  assert.throws(() => normalizeBooking(baseBooking({ checkin: '2020-01-01', checkout: '2020-01-02' })), /past/);
  assert.throws(() => normalizeBooking(baseBooking({ checkin: '2027-02-30', checkout: '2027-03-02' })), /valid check-in/);
});

test('initializes a Paystack transaction using a server-calculated amount', async () => {
  const previousKey = process.env.PAYSTACK_SECRET_KEY;
  const previousUrl = process.env.URL;
  const previousFetch = global.fetch;
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_example';
  process.env.URL = 'https://lattafaluxuryretreat.netlify.app';
  let request;
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ status: true, data: { authorization_url: 'https://checkout.paystack.test/example' } }) };
  };

  try {
    const result = await createPayment({ httpMethod: 'POST', headers: {}, body: JSON.stringify(baseBooking({ room: 'whole-compound', checkout: futureDate(4) })) });
    const response = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(request.url, 'https://api.paystack.co/transaction/initialize');
    assert.equal(request.body.amount, 750000);
    assert.equal(request.body.currency, 'KES');
    assert.equal(request.body.metadata.expected_amount, 750000);
    assert.match(response.reference, /^lattafa-\d{13}-[a-f0-9]{16}$/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previousKey;
    if (previousUrl === undefined) delete process.env.URL; else process.env.URL = previousUrl;
  }
});

test('does not expose test checkout on the normal public booking flow', async () => {
  const previousKey = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_example';
  try {
    const result = await createPayment({ httpMethod: 'POST', headers: {}, body: JSON.stringify(baseBooking({ test_mode_acknowledged: 'false' })) });
    assert.equal(result.statusCode, 503);
  } finally {
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previousKey;
  }
});

test('verifies status, KES currency, reference and exact amount', async () => {
  const booking = baseBooking({ payment_option: 'pay-now' });
  const normalized = normalizeBooking(booking);
  const payment = {
    status: 'success',
    currency: 'KES',
    reference: 'lattafa-1760000000000-abcdef0123456789',
    amount: normalized.amountSubunit,
    metadata: {
      room: booking.room,
      checkin: booking.checkin,
      checkout: booking.checkout,
      guest_name: booking.name,
      guest_email: booking.email,
      guest_phone: booking.phone,
      guests: booking.guests,
      stay_type: booking.stay_type,
      payment_option: booking.payment_option,
      expected_amount: normalized.amountSubunit
    }
  };
  assert.equal(verifyPaymentData(payment).amountDue, normalized.total);
  assert.throws(() => verifyPaymentData({ ...payment, amount: 100 }), /does not match/);
});

test('verification endpoint rejects mismatched Paystack amounts', async () => {
  const previousKey = process.env.PAYSTACK_SECRET_KEY;
  const previousFetch = global.fetch;
  process.env.PAYSTACK_SECRET_KEY = 'sk_test_example';
  const booking = baseBooking({ payment_option: 'pay-now' });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: {
        status: 'success', currency: 'KES', reference: 'lattafa-1760000000000-abcdef0123456789', amount: 100,
        metadata: {
          room: booking.room, checkin: booking.checkin, checkout: booking.checkout,
          guest_name: booking.name, guest_email: booking.email, guest_phone: booking.phone,
          guests: booking.guests, stay_type: booking.stay_type, payment_option: booking.payment_option,
          expected_amount: 100
        }
      }
    })
  });
  try {
    const result = await verifyPayment({ httpMethod: 'GET', queryStringParameters: { reference: 'lattafa-1760000000000-abcdef0123456789' } });
    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).paid, false);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previousKey;
  }
});

test('reports test and live availability without exposing the key', async () => {
  const previousKey = process.env.PAYSTACK_SECRET_KEY;
  try {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_example';
    let result = JSON.parse((await paymentStatus()).body);
    assert.deepEqual(result, { provider: 'paystack', enabled: false, testAvailable: true, mode: 'test' });
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_example';
    result = JSON.parse((await paymentStatus()).body);
    assert.deepEqual(result, { provider: 'paystack', enabled: true, testAvailable: false, mode: 'live' });
  } finally {
    if (previousKey === undefined) delete process.env.PAYSTACK_SECRET_KEY; else process.env.PAYSTACK_SECRET_KEY = previousKey;
  }
});
