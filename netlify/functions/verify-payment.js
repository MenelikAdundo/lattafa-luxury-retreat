exports.handler = async event => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed.' }) };
  const transactionId = event.queryStringParameters?.transaction_id;
  if (!transactionId || !process.env.FLW_SECRET_KEY) return { statusCode: 400, body: JSON.stringify({ paid: false, message: 'Payment verification is unavailable.' }) };
  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } });
    const result = await response.json(); const payment = result?.data;
    const paid = response.ok && payment?.status === 'successful' && payment?.currency === 'KES' && String(payment?.tx_ref || '').startsWith('lattafa-');
    return { statusCode: paid ? 200 : 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid, reference: payment?.tx_ref || null, amount: payment?.amount || null, message: paid ? 'Payment verified.' : 'Payment could not be verified.' }) };
  } catch { return { statusCode: 502, body: JSON.stringify({ paid: false, message: 'Payment verification failed.' }) }; }
};
