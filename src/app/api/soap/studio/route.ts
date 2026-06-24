import { NextRequest, NextResponse } from 'next/server'
import {
  STUDIO_NS,
  escapeXml,
  getElementText,
  resolveOperation,
  buildEnvelope,
  buildFault,
} from '@/lib/soap'

// ---------------------------------------------------------------------------
// A demo SOAP 1.1 web service for the dance studio domain.
//
//   GET  /api/soap/studio?wsdl   -> the WSDL contract (service description)
//   POST /api/soap/studio        -> invoke an operation via a SOAP envelope
//
// Operations:
//   GetClassPrice(className)  -> { found, className, monthlyTuition, currency }
//   ListClasses()            -> { class[] }
//
// This contrasts with the REST API everywhere else in this repo: there, the
// HTTP verb + resource URL express intent and responses are JSON. Here, ONE
// URL handles every operation, the operation name lives in the XML body, and
// both request and response are XML envelopes described by a WSDL.
//
// The dataset is static so the example runs with no database. The same handler
// could just as easily query Supabase like the REST routes do.
// ---------------------------------------------------------------------------

const XML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' }

const CLASS_CATALOG: Array<{ name: string; monthlyTuition: number }> = [
  { name: 'Ballet I', monthlyTuition: 85 },
  { name: 'Ballet II', monthlyTuition: 95 },
  { name: 'Hip Hop', monthlyTuition: 80 },
  { name: 'Jazz', monthlyTuition: 80 },
  { name: 'Tap', monthlyTuition: 75 },
  { name: 'Contemporary', monthlyTuition: 90 },
]

// --- GET: serve the WSDL ----------------------------------------------------

function buildWsdl(serviceUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="StudioService"
    targetNamespace="${STUDIO_NS}"
    xmlns:tns="${STUDIO_NS}"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
    xmlns="http://schemas.xmlsoap.org/wsdl/">

  <!-- 1. TYPES: XML schema for every message's payload -->
  <types>
    <xsd:schema targetNamespace="${STUDIO_NS}">
      <xsd:element name="GetClassPrice">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="className" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="GetClassPriceResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="found" type="xsd:boolean"/>
            <xsd:element name="className" type="xsd:string"/>
            <xsd:element name="monthlyTuition" type="xsd:decimal"/>
            <xsd:element name="currency" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="ListClasses">
        <xsd:complexType><xsd:sequence/></xsd:complexType>
      </xsd:element>
      <xsd:element name="ListClassesResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="class" minOccurs="0" maxOccurs="unbounded">
              <xsd:complexType>
                <xsd:sequence>
                  <xsd:element name="name" type="xsd:string"/>
                  <xsd:element name="monthlyTuition" type="xsd:decimal"/>
                </xsd:sequence>
              </xsd:complexType>
            </xsd:element>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <!-- 2. MESSAGES: tie schema elements to logical request/response messages -->
  <message name="GetClassPriceRequest"><part name="parameters" element="tns:GetClassPrice"/></message>
  <message name="GetClassPriceResponse"><part name="parameters" element="tns:GetClassPriceResponse"/></message>
  <message name="ListClassesRequest"><part name="parameters" element="tns:ListClasses"/></message>
  <message name="ListClassesResponse"><part name="parameters" element="tns:ListClassesResponse"/></message>

  <!-- 3. PORT TYPE: the abstract interface (the operations and their messages) -->
  <portType name="StudioPortType">
    <operation name="GetClassPrice">
      <input message="tns:GetClassPriceRequest"/>
      <output message="tns:GetClassPriceResponse"/>
    </operation>
    <operation name="ListClasses">
      <input message="tns:ListClassesRequest"/>
      <output message="tns:ListClassesResponse"/>
    </operation>
  </portType>

  <!-- 4. BINDING: how the abstract interface maps to SOAP-over-HTTP -->
  <binding name="StudioBinding" type="tns:StudioPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="GetClassPrice">
      <soap:operation soapAction="${STUDIO_NS}#GetClassPrice"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="ListClasses">
      <soap:operation soapAction="${STUDIO_NS}#ListClasses"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <!-- 5. SERVICE: the concrete network address of the endpoint -->
  <service name="StudioService">
    <port name="StudioPort" binding="tns:StudioBinding">
      <soap:address location="${escapeXml(serviceUrl)}"/>
    </port>
  </service>
</definitions>`
}

export async function GET(request: NextRequest) {
  // Conventionally the WSDL is served from the endpoint URL with a `?wsdl` query.
  const url = new URL(request.url)
  const serviceUrl = `${url.origin}${url.pathname}`
  return new NextResponse(buildWsdl(serviceUrl), { headers: XML_HEADERS })
}

// --- POST: handle a SOAP operation ------------------------------------------

export async function POST(request: NextRequest) {
  const body = await request.text()
  const operation = resolveOperation(body, request.headers.get('SOAPAction'))

  try {
    switch (operation) {
      case 'GetClassPrice': {
        const className = getElementText(body, 'className')
        if (!className) {
          return new NextResponse(
            buildFault('soap:Client', 'Missing required parameter: className'),
            { status: 400, headers: XML_HEADERS },
          )
        }
        const hit = CLASS_CATALOG.find(c => c.name.toLowerCase() === className.toLowerCase())
        const inner =
          `    <tns:GetClassPriceResponse>\n` +
          `      <found>${hit ? 'true' : 'false'}</found>\n` +
          `      <className>${escapeXml(hit?.name ?? className)}</className>\n` +
          `      <monthlyTuition>${hit ? hit.monthlyTuition.toFixed(2) : '0.00'}</monthlyTuition>\n` +
          `      <currency>USD</currency>\n` +
          `    </tns:GetClassPriceResponse>`
        return new NextResponse(buildEnvelope(inner), { headers: XML_HEADERS })
      }

      case 'ListClasses': {
        const rows = CLASS_CATALOG.map(
          c =>
            `      <class>\n` +
            `        <name>${escapeXml(c.name)}</name>\n` +
            `        <monthlyTuition>${c.monthlyTuition.toFixed(2)}</monthlyTuition>\n` +
            `      </class>`,
        ).join('\n')
        const inner = `    <tns:ListClassesResponse>\n${rows}\n    </tns:ListClassesResponse>`
        return new NextResponse(buildEnvelope(inner), { headers: XML_HEADERS })
      }

      default:
        return new NextResponse(
          buildFault('soap:Client', `Unknown operation: ${operation ?? '(none)'}`),
          { status: 400, headers: XML_HEADERS },
        )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return new NextResponse(buildFault('soap:Server', msg), { status: 500, headers: XML_HEADERS })
  }
}
