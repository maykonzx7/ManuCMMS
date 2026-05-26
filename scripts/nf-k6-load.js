/**
 * NF-06 — carga básica (~50 VUs) contra API de homologação.
 * Uso: k6 run -e API_BASE_URL=https://api.seudominio.com scripts/nf-k6-load.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.API_BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${base}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => r.body && r.body.includes('ok'),
  });
  sleep(1);
}
