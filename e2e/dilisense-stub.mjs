import { createServer } from 'node:http'

// Test-only Dilisense. Browser tests never spend the real monthly quota: one politically
// exposed person, Lawrence Wong, and nobody else.
createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  const reply = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  }
  if (url.pathname === '/health') return reply(200, { ready: true })
  if (url.pathname !== '/v1/checkIndividual') return reply(404, { error: 'Unknown local Dilisense route' })
  if (request.headers['x-api-key'] !== 'dilisense_kivilo_e2e') return reply(401, { error: 'Use the local test key' })
  const found_records = url.searchParams.get('names') === 'Lawrence Wong'
    ? [{ id: 'e2e-pep', source_type: 'PEP', pep_type: 'POLITICIAN', name: 'Lawrence Wong', date_of_birth: ['18/12/1972'], citizenship: ['SG'], positions: ['Prime Minister of Singapore'] }]
    : []
  reply(200, { timestamp: new Date().toISOString(), total_hits: found_records.length, found_records })
}).listen(3113, '127.0.0.1')
