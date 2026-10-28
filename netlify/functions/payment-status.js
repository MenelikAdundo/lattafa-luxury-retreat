exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ enabled: Boolean(process.env.FLW_SECRET_KEY) })
});
