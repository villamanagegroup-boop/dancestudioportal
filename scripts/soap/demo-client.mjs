#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Runnable SOAP client demo. Calls the /api/soap/studio service so you can see
// the XML envelopes go over the wire and the responses come back.
//
//   1. Start the app:   npm run dev
//   2. In another shell: node scripts/soap/demo-client.mjs
//
// Override the target with BASE_URL, e.g.:
//   BASE_URL=http://localhost:3000 node scripts/soap/demo-client.mjs
//
// This is plain Node (no project imports) so it runs without a build step.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const ENDPOINT = `${BASE_URL}/api/soap/studio`
const STUDIO_NS = 'urn:dancestudio:soap'

function escapeXml(v) {
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function buildEnvelope(operation, params = {}) {
  const args = Object.entries(params)
    .map(([k, v]) => `      <${k}>${escapeXml(v)}</${k}>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${STUDIO_NS}">
  <soap:Body>
    <tns:${operation}>
${args}
    </tns:${operation}>
  </soap:Body>
</soap:Envelope>`
}

async function callSoap(operation, params = {}) {
  const envelope = buildEnvelope(operation, params)
  console.log(`\n=== REQUEST: ${operation} ===`)
  console.log(envelope)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${STUDIO_NS}#${operation}"`,
    },
    body: envelope,
  })
  const text = await res.text()
  console.log(`\n--- RESPONSE (HTTP ${res.status}) ---`)
  console.log(text)
  return text
}

async function main() {
  // 1. Fetch the WSDL contract.
  console.log('=== WSDL ===')
  const wsdl = await fetch(`${ENDPOINT}?wsdl`).then(r => r.text())
  console.log(wsdl.slice(0, 400) + '\n... (truncated)')

  // 2. List all classes.
  await callSoap('ListClasses')

  // 3. Look up a known class.
  await callSoap('GetClassPrice', { className: 'Ballet I' })

  // 4. Look up an unknown class (found=false).
  await callSoap('GetClassPrice', { className: 'Breakdancing' })

  // 5. Trigger a SOAP Fault (missing required parameter).
  await callSoap('GetClassPrice', {})
}

main().catch(err => {
  console.error('\nDemo failed:', err.message)
  console.error(`Is the dev server running at ${BASE_URL}?`)
  process.exit(1)
})
