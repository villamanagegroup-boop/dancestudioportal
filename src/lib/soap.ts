// ---------------------------------------------------------------------------
// Minimal, dependency-free SOAP 1.1 toolkit (learning example).
//
// SOAP is an XML-based RPC protocol. Unlike REST (where the HTTP verb + URL
// carry meaning), every SOAP call is an HTTP POST of an XML "Envelope" to a
// single endpoint. The operation name and arguments live *inside* the XML body,
// and the service is described by a machine-readable contract (a WSDL).
//
//   POST /api/soap/studio        <- one endpoint for every operation
//   Content-Type: text/xml
//   SOAPAction: "GetClassPrice"  <- which operation, as an HTTP header
//   <soap:Envelope>
//     <soap:Body>
//       <GetClassPrice><className>Ballet I</className></GetClassPrice>
//     </soap:Body>
//   </soap:Envelope>
//
// This file hand-rolls envelope building/parsing with string templates and
// regex. That is intentional — it keeps the example dependency-free and shows
// the wire format. A production SOAP integration should use a real XML parser
// (e.g. fast-xml-parser) and ideally generate types from the WSDL.
// ---------------------------------------------------------------------------

export const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/'
export const STUDIO_NS = 'urn:dancestudio:soap'

/** Escape a value so it is safe to embed as XML text/attribute content. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Reverse of escapeXml — decode the five predefined XML entities. */
export function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * Pull the text content of the first matching element out of an XML string.
 * Namespace-prefix agnostic: `getElementText(xml, 'className')` matches
 * `<className>`, `<tns:className>`, `<ns1:className>`, etc. Returns null if the
 * element is absent. (Regex parsing is fine for this flat demo schema; it is
 * NOT a substitute for a real parser on arbitrary documents.)
 */
export function getElementText(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[\\w.-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
    'i',
  )
  const m = xml.match(re)
  return m ? unescapeXml(m[1].trim()) : null
}

/**
 * Identify which operation a request envelope is invoking. SOAP 1.1 clients may
 * advertise it via the `SOAPAction` HTTP header, but the authoritative source
 * is the first child element of <soap:Body>. We prefer the header when present
 * and fall back to sniffing the body.
 */
export function resolveOperation(body: string, soapActionHeader?: string | null): string | null {
  const action = soapActionHeader?.replace(/"/g, '').trim()
  if (action) {
    // SOAPAction may be a bare name or a full URI like "urn:...#GetClassPrice".
    const tail = action.split(/[#/]/).pop()
    if (tail) return tail
  }
  // Fall back to the first element inside the <Body>.
  const bodyMatch = body.match(/<(?:[\w.-]+:)?Body[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?Body>/i)
  const inner = bodyMatch?.[1] ?? body
  const opMatch = inner.match(/<(?:[\w.-]+:)?([A-Za-z][\w.-]*)/)
  return opMatch ? opMatch[1] : null
}

/** Wrap an already-serialized response payload in a SOAP 1.1 envelope. */
export function buildEnvelope(innerXml: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<soap:Envelope xmlns:soap="${SOAP_NS}" xmlns:tns="${STUDIO_NS}">\n` +
    `  <soap:Body>\n${innerXml}\n  </soap:Body>\n` +
    `</soap:Envelope>`
  )
}

/**
 * Build a SOAP Fault — the protocol's structured error format (roughly the SOAP
 * equivalent of returning a 4xx/5xx with an error body in REST). faultcode is
 * conventionally `soap:Client` (bad request) or `soap:Server` (server failure).
 */
export function buildFault(faultcode: 'soap:Client' | 'soap:Server', faultstring: string): string {
  return buildEnvelope(
    `    <soap:Fault>\n` +
    `      <faultcode>${faultcode}</faultcode>\n` +
    `      <faultstring>${escapeXml(faultstring)}</faultstring>\n` +
    `    </soap:Fault>`,
  )
}

// ---------------------------------------------------------------------------
// A tiny SOAP *client* — the consuming side. Mirrors how src/lib/paypal.ts is a
// hand-rolled REST client, but for SOAP: build an envelope, POST it as text/xml
// with a SOAPAction header, then parse the XML response (or Fault) back out.
// ---------------------------------------------------------------------------

export class SoapFaultError extends Error {
  constructor(public faultcode: string, faultstring: string) {
    super(faultstring)
    this.name = 'SoapFaultError'
  }
}

/**
 * Invoke a SOAP operation over HTTP.
 * @param endpoint  Absolute URL of the SOAP service.
 * @param operation Operation name (becomes the body element + SOAPAction).
 * @param params    Flat map of argument name -> value (serialized as child elements).
 * @returns The raw XML string of the response <Body> contents.
 */
export async function callSoap(
  endpoint: string,
  operation: string,
  params: Record<string, string | number | boolean> = {},
): Promise<string> {
  const args = Object.entries(params)
    .map(([k, v]) => `      <${k}>${escapeXml(String(v))}</${k}>`)
    .join('\n')

  const envelope = buildEnvelope(
    `    <tns:${operation}>\n${args}\n    </tns:${operation}>`,
  )

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${STUDIO_NS}#${operation}"`,
    },
    body: envelope,
  })

  const text = await res.text()

  // A SOAP Fault is reported in the body (often with HTTP 500). Surface it as
  // a typed error so callers can distinguish protocol faults from transport errors.
  if (/<(?:[\w.-]+:)?Fault[\s>]/i.test(text)) {
    const code = getElementText(text, 'faultcode') ?? 'soap:Server'
    const str = getElementText(text, 'faultstring') ?? 'Unknown SOAP fault'
    throw new SoapFaultError(code, str)
  }
  if (!res.ok) throw new Error(`SOAP transport error ${res.status}: ${text.slice(0, 200)}`)

  return text
}
