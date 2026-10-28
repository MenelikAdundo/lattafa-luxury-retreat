const RATES = { '1-bedroom-suite': 3000, '2-bedroom-suite': 4000, '3-bedroom-villa': 6000, '4-bedroom-villa': 7500, 'whole-compound': 15000 };
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed.' }) };
  if (!process.env.FLW_SECRET_KEY) return { statusCode: 503, body: JSON.stringify({ message: 'Online payments are being verified. Please choose pay at check-in or contact us on WhatsApp.' }) };
  try {
    const booking = JSON.parse(event.body || '{}'); const rate = RATES[booking.room];
    const nights = Math.round((new Date(`${booking.checkout}T00:00:00`) - new Date(`${booking.checkin}T00:00:00`)) / 86400000);
    if (!rate || nights < 1 || !booking.name || !booking.email || !booking.phone) throw new Error('Please complete valid booking details before paying.');
    const total = rate * nights; const amount = booking.payment_option === 'deposit' ? Math.ceil(total * 0.3) : total;
    if (!['pay-now', 'deposit'].includes(booking.payment_option)) throw new Error('Choose an online payment option.');
    const txRef = `lattafa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const origin = process.env.URL || `https://${event.headers.host}`;
    const response = await fetch('https://api.flutterwave.com/v3/payments', { method: 'POST', headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tx_ref: txRef, amount, currency: 'KES', redirect_url: `${origin}/payment-success.html`, customer: { email: booking.email, name: booking.name, phonenumber: booking.phone }, customizations: { title: 'Lattafa Luxury Retreat', description: booking.payment_option === 'deposit' ? '30% booking deposit' : 'Accommodation payment' }, meta: [{ metaname: 'room', metavalue: booking.room }, { metaname: 'checkin', metavalue: booking.checkin }, { metaname: 'checkout', metavalue: booking.checkout }, { metaname: 'payment_option', metavalue: booking.payment_option }] }) });
    const data = await response.json(); if (!response.ok || !data?.data?.link) throw new Error(data?.message || 'Unable to create secure checkout.');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link: data.data.link, txRef }) };
  } catch (error) { return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: error.message || 'Unable to start payment.' }) }; }
};
