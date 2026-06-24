# SOAP web service — hands-on example

This repo's API is REST. This folder adds a small, self-contained **SOAP 1.1**
service so you can get hands-on with the other major web-service style. It's a
learning artifact, kept deliberately separate from the production REST API.

## Files

| File | Role |
| --- | --- |
| `src/app/api/soap/studio/route.ts` | The SOAP **service** — serves a WSDL (`GET ?wsdl`) and handles operations (`POST`). |
| `src/lib/soap.ts` | A dependency-free SOAP **toolkit** — envelope/Fault builders, a tiny XML extractor, and a `callSoap()` **client** (mirrors how `src/lib/paypal.ts` is a hand-rolled REST client). |
| `scripts/soap/demo-client.mjs` | Runnable demo that calls every operation and prints the XML. |
| `src/proxy.ts` | `/api/soap` is allowlisted as public so the demo is reachable. |

## REST vs SOAP — what's actually different

| | REST (rest of this repo) | SOAP (this example) |
| --- | --- | --- |
| Endpoints | Many: `/api/classes`, `/api/families/[id]`, … | **One**: `/api/soap/studio` |
| Intent comes from | HTTP verb + URL (`GET`, `POST`, `DELETE`) | The **operation name inside the XML body** (`SOAPAction` header) |
| Payload | JSON | **XML envelope** |
| Contract | Informal / OpenAPI | **WSDL** (machine-readable, formal) |
| Errors | HTTP status + JSON `{ error }` | **SOAP Fault** element (`faultcode`/`faultstring`) |

## Operations

- `GetClassPrice(className)` → `{ found, className, monthlyTuition, currency }`
- `ListClasses()` → list of `{ name, monthlyTuition }`

The dataset is static, so it runs with no database. The handler could query
Supabase exactly like the REST routes do.

## Try it

```bash
npm install        # dependencies aren't committed
npm run dev        # starts Next.js (dev mode bypasses the auth gate)

# In another shell — the scripted demo (WSDL + all operations + a Fault):
node scripts/soap/demo-client.mjs
```

### Or with raw curl

```bash
# 1. The WSDL contract
curl 'http://localhost:3000/api/soap/studio?wsdl'

# 2. Invoke GetClassPrice
curl -X POST http://localhost:3000/api/soap/studio \
  -H 'Content-Type: text/xml; charset=utf-8' \
  -H 'SOAPAction: "urn:dancestudio:soap#GetClassPrice"' \
  --data '<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:dancestudio:soap">
  <soap:Body>
    <tns:GetClassPrice><className>Ballet I</className></tns:GetClassPrice>
  </soap:Body>
</soap:Envelope>'
```

Expected response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:dancestudio:soap">
  <soap:Body>
    <tns:GetClassPriceResponse>
      <found>true</found>
      <className>Ballet I</className>
      <monthlyTuition>85.00</monthlyTuition>
      <currency>USD</currency>
    </tns:GetClassPriceResponse>
  </soap:Body>
</soap:Envelope>
```

Omit `<className>` to see a **SOAP Fault** (HTTP 400) instead.

## Calling it from app code

```ts
import { callSoap, getElementText } from '@/lib/soap'

const xml = await callSoap('http://localhost:3000/api/soap/studio', 'GetClassPrice', {
  className: 'Jazz',
})
const price = getElementText(xml, 'monthlyTuition') // "80.00"
```

## Caveats (this is a teaching example, not production SOAP)

- XML is parsed with regex to stay dependency-free. Real services should use a
  proper XML parser (e.g. `fast-xml-parser`) — regex can't handle CDATA,
  comments, or attribute edge cases safely.
- It implements SOAP 1.1 document/literal only; no WS-Security, MTOM, or
  WS-Addressing.
- For consuming third-party SOAP services in production, a library like `soap`
  (npm) reads the WSDL and generates typed client methods for you.
