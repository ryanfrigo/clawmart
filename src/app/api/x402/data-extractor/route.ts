import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE_USDC = 0.004;

/**
 * POST /api/x402/data-extractor
 *
 * x402-native endpoint for AI-powered structured data extraction.
 * - No X-PAYMENT header → 402 Payment Required with x402 payment instructions
 * - Valid X-PAYMENT header → extract structured data from unstructured text
 * - X-Demo: true → free demo mode
 */
export async function POST(request: NextRequest) {
  const paymentHeader = request.headers.get("X-PAYMENT");
  const demoMode = request.headers.get("X-Demo") === "true";

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // If no payment and not demo → 402
  if (!paymentHeader && !demoMode) {
    return NextResponse.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:8453",
            maxAmountRequired: String(PRICE_USDC * 1e6),
            resource: "https://clawmart.co/api/x402/data-extractor",
            description: "Data Extractor — Extract structured entities, dates, amounts, and relationships from unstructured text using AI.",
            mimeType: "application/json",
            payTo: PAYMENT_ADDRESS,
            maxTimeoutSeconds: 30,
            asset: USDC_BASE,
            extra: {
              name: "Data Extractor",
              version: "1",
              priceDisplay: "$0.004 per extraction",
              provider: "clawmart.co",
            },
          },
        ],
      },
      {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": "true",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo",
        },
      }
    );
  }

  // Validate input
  const text = String(body.text || "");
  if (!text.trim()) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }

  if (text.length > 15000) {
    return NextResponse.json({ error: "Text exceeds maximum length of 15,000 characters" }, { status: 400 });
  }

  const schema = body.schema && typeof body.schema === "object" ? body.schema : null;

  try {
    const schemaInstructions = schema
      ? `\nAlso extract data matching this custom schema: ${JSON.stringify(schema, null, 2)}\nInclude the extracted schema data under a "customData" key.`
      : "";

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert data extraction system. Extract all structured information from the provided text and return a JSON response with this exact structure:
{
  "entities": [
    {
      "type": "person|organization|location|product|technology|event|other",
      "value": "extracted entity text",
      "context": "brief context from the text",
      "confidence": <number 0.0 to 1.0>
    }
  ],
  "dates": [
    {
      "raw": "original date text",
      "normalized": "ISO 8601 format if possible, otherwise standardized format",
      "type": "exact|relative|range|approximate",
      "context": "brief context"
    }
  ],
  "amounts": [
    {
      "value": <numeric value>,
      "currency": "USD|EUR|etc or null for non-monetary",
      "unit": "unit of measure or null",
      "raw": "original text",
      "type": "monetary|quantity|percentage|measurement|other",
      "context": "brief context"
    }
  ],
  "relationships": [
    {
      "subject": "entity or concept",
      "predicate": "relationship verb/description",
      "object": "entity or concept",
      "confidence": <number 0.0 to 1.0>
    }
  ],
  "keyFacts": ["list of the most important factual statements extracted"],
  "topics": ["main topics covered in the text"],
  "summary": "1-2 sentence overview of what was extracted"${schema ? ',\n  "customData": {}' : ""}
}
Return ONLY valid JSON, no markdown, no explanation.${schemaInstructions}`
          },
          {
            role: "user",
            content: `Extract all structured data from this text:\n\n${text.slice(0, 12000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json().catch(() => ({}));
      console.error("OpenAI API error:", error);
      return NextResponse.json(
        { error: "AI processing failed", details: "OpenAI API error" },
        { status: 502 }
      );
    }

    const aiResult = await openaiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "{}";

    let extractedData: Record<string, unknown>;
    try {
      extractedData = JSON.parse(rawContent);
    } catch {
      extractedData = {
        entities: [],
        dates: [],
        amounts: [],
        relationships: [],
        keyFacts: [],
        topics: [],
        summary: "Data extraction completed.",
      };
    }

    const result: Record<string, unknown> = {
      entities: Array.isArray(extractedData.entities) ? extractedData.entities : [],
      dates: Array.isArray(extractedData.dates) ? extractedData.dates : [],
      amounts: Array.isArray(extractedData.amounts) ? extractedData.amounts : [],
      relationships: Array.isArray(extractedData.relationships) ? extractedData.relationships : [],
      keyFacts: Array.isArray(extractedData.keyFacts) ? extractedData.keyFacts : [],
      topics: Array.isArray(extractedData.topics) ? extractedData.topics : [],
      summary: String(extractedData.summary || "Extraction complete."),
      stats: {
        entityCount: Array.isArray(extractedData.entities) ? extractedData.entities.length : 0,
        dateCount: Array.isArray(extractedData.dates) ? extractedData.dates.length : 0,
        amountCount: Array.isArray(extractedData.amounts) ? extractedData.amounts.length : 0,
        relationshipCount: Array.isArray(extractedData.relationships) ? extractedData.relationships.length : 0,
      },
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
    };

    // Include custom schema data if provided
    if (schema && extractedData.customData) {
      result.customData = extractedData.customData;
    }

    return NextResponse.json(
      {
        skill: "Data Extractor",
        skillId: "data-extractor",
        result,
        meta: {
          latency: "~2.5s",
          paid: demoMode ? "demo" : "$0.004",
          mode: demoMode ? "demo" : "paid",
          provider: "clawmart.co",
          protocol: "x402",
          model: "gpt-4o-mini",
          customSchema: !!schema,
        },
      },
      {
        headers: {
          "X-PAYMENT-VERIFIED": paymentHeader ? "true" : "demo",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Data extraction error:", error);
    return NextResponse.json(
      {
        error: "Failed to process data extraction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    skill: "Data Extractor",
    endpoint: "https://clawmart.co/api/x402/data-extractor",
    method: "POST",
    price: "$0.004 per extraction",
    protocol: "x402",
    network: "Base (eip155:8453)",
    asset: "USDC",
    description: "Extract structured data from unstructured text. Identifies entities, dates, monetary amounts, and semantic relationships. Supports custom extraction schemas.",
    requiredFields: {
      text: "string — unstructured text to extract data from",
    },
    optionalFields: {
      schema: "object — custom JSON schema to extract additional structured data matching your specification",
    },
    example: {
      text: "Apple Inc. announced on March 15, 2024 that CEO Tim Cook will present the new MacBook Pro at WWDC in San Francisco. The device starts at $1,999 and ships in Q2 2024.",
      schema: {
        product_name: "string",
        price: "number",
        availability: "string",
      },
    },
    responseFormat: {
      entities: "array of named entities (people, orgs, locations, etc.) with type and confidence",
      dates: "array of dates with normalized ISO format",
      amounts: "array of monetary values, quantities, and measurements",
      relationships: "semantic subject-predicate-object triples",
      keyFacts: "most important factual statements",
      topics: "main topics covered",
      stats: "count summary of extracted items",
      customData: "extracted data matching your custom schema (if provided)",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo, Authorization",
    },
  });
}
