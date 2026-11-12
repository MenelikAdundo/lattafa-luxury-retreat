const { getPaystackMode, json } = require('./lib/payment-utils');

exports.handler = async () => {
  const mode = getPaystackMode(process.env.PAYSTACK_SECRET_KEY);
  return json(200, {
    provider: 'paystack',
    enabled: mode === 'live',
    testAvailable: mode === 'test',
    mode: mode || 'unconfigured'
  });
};
