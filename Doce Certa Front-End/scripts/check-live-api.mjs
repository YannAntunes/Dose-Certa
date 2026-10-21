const value = process.env.API_SMOKE_URL;
if (!value) {
  console.error('Set API_SMOKE_URL to the public backend URL.');
  process.exit(2);
}
let base = value.trim();
while (base.endsWith('/')) base = base.slice(0, -1);
let response;
try {
  response = await fetch(base + '/health/ready', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
} catch (error) {
  console.error('Connection failed for ' + base + ': ' + error.message);
  process.exit(1);
}
const body = await response.json().catch(() => ({}));
if (!response.ok || body.status !== 'UP' || body.database !== 'UP') {
  console.error('API/database smoke test failed:', {
    httpStatus: response.status,
    status: body.status ?? 'UNKNOWN',
    database: body.database ?? 'UNKNOWN',
  });
  process.exit(1);
}
console.log('Smoke test passed: API responds and SELECT 1 succeeds.');
