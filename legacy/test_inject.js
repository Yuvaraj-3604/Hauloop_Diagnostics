/**
 * Quick Node.js verification script to test /api/telemetry/inject
 */
const http = require('http');

const testPayload = JSON.stringify({
  imei: "867530901234567",
  lat: 10.823078,
  lng: 78.685815,
  avl: {
    "145": 16000, // 2000 RPM
    "146": 20480, // 80 km/h
    "147": 125,   // 50% pedal
    "148": 195,   // 70% torque
    "151": 460,   // 23 L/h
    "152": 133,   // 93 °C
    "153": 110,   // 440 kPa
    "154": 180,   // 72% DEF
    "380": 105,   // 840 kPa
    "381": 104,   // 832 kPa
    "382": 133,   // Gear 8
    "239": 1
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/telemetry/inject',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testPayload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    const parsed = JSON.parse(data);
    console.log('Injected & Decoded KPIs:');
    console.log('  RPM:', parsed.decoded.kpis.rpm);
    console.log('  Speed:', parsed.decoded.kpis.speed, 'km/h');
    console.log('  Coolant:', parsed.decoded.kpis.coolantTemp, '°C');
    console.log('  Oil:', parsed.decoded.kpis.oilPressure, 'kPa');
    console.log('  Total Signals Decoded:', parsed.decoded.signals.length);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(testPayload);
req.end();
