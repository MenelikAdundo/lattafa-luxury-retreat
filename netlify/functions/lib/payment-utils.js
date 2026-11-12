const RATES = Object.freeze({
  '1-bedroom-suite': 3000,
  '2-bedroom-suite': 4000,
  '3-bedroom-villa': 6000,
  '4-bedroom-villa': 7500,
  'whole-compound': 15000
});

const NAMES = Object.freeze({
  '1-bedroom-suite': '1 Bedroom Suite',
  '2-bedroom-suite': '2 Bedroom Suite',
  '3-bedroom-villa': '3 Bedroom Family Villa',
  '4-bedroom-villa': '4 Bedroom Family Villa',
  'whole-compound': '8 Bedroom Whole Compound / Private Event'
});

class BookingValidationError extends Error {}

const clean = (value, maxLength = 200) => String(value || '').trim().slice(0, maxLength);

const parseDate = value => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value, 10));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};

const todayInNairobi = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getNights = (checkin, checkout) => {
  const start = parseDate(checkin);
  const end = parseDate(checkout);
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
};

const normalizeBooking = (raw = {}, { allowPast = false } = {}) => {
  const room = clean(raw.room, 40);
  const rate = RATES[room];
  const checkin = clean(raw.checkin, 10);
  const checkout = clean(raw.checkout, 10);
  const nights = getNights(checkin, checkout);
  const name = clean(raw.name, 120);
  const email = clean(raw.email, 160).toLowerCase();
  const phone = clean(raw.phone, 30);
  const stayType = clean(raw.stay_type, 60);
  const guests = Number.parseInt(raw.guests, 10);
  const paymentOption = clean(raw.payment_option, 20);

  if (!rate || !parseDate(checkin) || !parseDate(checkout) || nights < 1) {
    throw new BookingValidationError('Please choose valid check-in and check-out dates.');
  }
  if (!allowPast && checkin < todayInNairobi()) {
    throw new BookingValidationError('Check-in cannot be in the past.');
  }
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[+\d][+\d\s()-]{6,29}$/.test(phone)) {
    throw new BookingValidationError('Please complete valid guest contact details.');
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 40) {
    throw new BookingValidationError('Please enter a valid number of guests.');
  }
  if (!['pay-now', 'deposit'].includes(paymentOption)) {
    throw new BookingValidationError('Choose a valid online payment option.');
  }

  const total = rate * nights;
  const isGroupBooking = room === 'whole-compound' || stayType.toLowerCase() === 'private event';
  const depositRate = isGroupBooking ? 0.5 : 0.3;
  const amountDue = paymentOption === 'deposit' ? Math.ceil(total * depositRate) : total;

  return {
    room, roomName: NAMES[room], rate, checkin, checkout, nights, name, email, phone,
    stayType, guests, paymentOption, total, depositRate, amountDue,
    amountSubunit: amountDue * 100
  };
};

const getPaystackMode = key => {
  if (String(key || '').startsWith('sk_live_')) return 'live';
  if (String(key || '').startsWith('sk_test_')) return 'test';
  return null;
};

const parseMetadata = metadata => {
  if (metadata && typeof metadata === 'object') return metadata;
  if (typeof metadata === 'string') {
    try { return JSON.parse(metadata); } catch { return {}; }
  }
  return {};
};

const verifyPaymentData = payment => {
  if (!payment || payment.status !== 'success' || payment.currency !== 'KES') {
    throw new BookingValidationError('Payment is not complete.');
  }
  const reference = clean(payment.reference, 80);
  if (!/^lattafa-\d{13}-[a-f0-9]{16}$/.test(reference)) {
    throw new BookingValidationError('Payment reference is invalid.');
  }
  const metadata = parseMetadata(payment.metadata);
  const booking = normalizeBooking({
    room: metadata.room,
    checkin: metadata.checkin,
    checkout: metadata.checkout,
    name: metadata.guest_name,
    email: metadata.guest_email,
    phone: metadata.guest_phone,
    guests: metadata.guests,
    stay_type: metadata.stay_type,
    payment_option: metadata.payment_option
  }, { allowPast: true });
  if (Number(payment.amount) !== booking.amountSubunit || Number(metadata.expected_amount) !== booking.amountSubunit) {
    throw new BookingValidationError('Payment amount does not match this booking.');
  }
  return { ...booking, reference };
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

module.exports = {
  BookingValidationError,
  RATES,
  NAMES,
  getNights,
  getPaystackMode,
  json,
  normalizeBooking,
  todayInNairobi,
  verifyPaymentData
};
