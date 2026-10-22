import { createServer } from 'node:http'

// Test-only Resend transport. Delivery is always to the local Mailpit HTTP API;
// there is deliberately no configurable upstream or network-delivery fallback.
const MAILPIT = 'http://127.0.0.1:56324'
const address = (value) => {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value)
  return match ? { Name: match[1], Email: match[2] } : { Email: value }
}
const addresses = (value) => (Array.isArray(value) ? value : [value]).map(address)
const receipts = new Map()

createServer(async (request, response) => {
  const reply = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
  }
  if (request.method === 'GET' && request.url === '/health') {
    return reply(200, { ready: true })
  }
  if (request.method !== 'POST' || request.url !== '/emails') {
    return reply(404, { name: 'not_found', message: 'Unknown local email route' })
  }
  if (request.headers.authorization !== 'Bearer re_kivilo_e2e') {
    return reply(401, { name: 'validation_error', message: 'Use the local test email key' })
  }
  try {
    const key = request.headers['idempotency-key']
    if (key && receipts.has(key)) return reply(200, receipts.get(key))
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const message = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    // Keys follow the installed Mailpit /api/v1/swagger.json SendRequest schema.
    const sent = await fetch(`${MAILPIT}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: address(message.from),
        To: addresses(message.to),
        Subject: message.subject,
        Text: message.text,
        HTML: message.html,
        ...(message.cc && { Cc: addresses(message.cc) }),
        ...(message.bcc && { Bcc: Array.isArray(message.bcc) ? message.bcc : [message.bcc] }),
        ...(message.reply_to && { ReplyTo: addresses(message.reply_to) }),
        ...(message.attachments && {
          Attachments: message.attachments.map((attachment) => ({
            Filename: attachment.filename,
            Content:
              attachment.content?.type === 'Buffer'
                ? Buffer.from(attachment.content.data).toString('base64')
                : attachment.content,
            ContentType: attachment.content_type,
          })),
        }),
      }),
    })
    if (!sent.ok) throw new Error(`Local Mailpit refused email (${sent.status})`)
    const { ID } = await sent.json()
    const receipt = { id: ID }
    if (key) receipts.set(key, receipt)
    reply(200, receipt)
  } catch (error) {
    console.error('Local email delivery failed:', error)
    reply(500, { name: 'application_error', message: 'Local Mailpit delivery failed' })
  }
}).listen(3112, '127.0.0.1')
