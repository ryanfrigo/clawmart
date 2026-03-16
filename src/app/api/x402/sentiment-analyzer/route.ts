import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE_USDC = 0.001;

/**
 * POST /api/x402/sentiment-analyzer
 *
 * x402-native endpoint for AI-powered sentiment analysis.
 * - No X-PAYMENT header → 402 Payment Required with x402 payment instructions
 * - Valid X-PAYMENT header → analyze text sentiment and emotions
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
            resource: "https://clawmart.co/api/x402/sentiment-analyzer",
            description: "Sentiment Analyzer — Deep sentiment and emotion analysis for any text with confidence scores and breakdown.",
            mimeType: "application/json",
            payTo: PAYMENT_ADDRESS,
            maxTimeoutSeconds: 30,
            asset: USDC_BASE,
            extra: {
              name: "Sentiment Analyzer",
              version: "1",
              priceDisplay: "$0.001 per analysis",
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

  if (text.length > 10000) {
    return NextResponse.json({ error: "Text exceeds maximum length of 10,000 characters" }, { status: 400 });
  }

  try {
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
            content: `You are an expert sentiment analysis system. Analyze the provided text and return a JSON response with this exact structure:
{
  "overallSentiment": "positive|negative|neutral|mixed",
  "score": <number -1.0 to 1.0, where -1 is most negative, 0 is neutral, 1 is most positive>,
  "confidence": <number 0.0 to 1.0>,
  "emotions": {
    "joy": <number 0.0 to 1.0>,
    "sadness": <number 0.0 to 1.0>,
    "anger": <number 0.0 to 1.0>,
    "fear": <number 0.0 to 1.0>,
    "surprise": <number 0.0 to 1.0>,
    "disgust": <number 0.0 to 1.0>,
    "anticipation": <number 0.0 to 1.0>,
    "trust": <number 0.0 to 1.0>
  },
  "dominantEmotion": "the strongest emotion name",
  "subjectivity": <number 0.0 to 1.0, where 0 is objective, 1 is subjective>,
  "intensity": "low|medium|high",
  "keywords": ["most emotionally significant words or phrases"],
  "summary": "brief 1-2 sentence explanation of the sentiment analysis"
}
Return ONLY valid JSON, no markdown, no explanation.`
          },
          {
            role: "user",
            content: `Analyze the sentiment of this text:\n\n${text.slice(0, 8000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 600,
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

    let sentimentData: Record<string, unknown>;
    try {
      sentimentData = JSON.parse(rawContent);
    } catch {
      sentimentData = {
        overallSentiment: "neutral",
        score: 0,
        confidence: 0.5,
        emotions: { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0, anticipation: 0, trust: 0 },
        dominantEmotion: "neutral",
        subjectivity: 0.5,
        intensity: "medium",
        keywords: [],
        summary: "Sentiment analysis completed.",
      };
    }

    return NextResponse.json(
      {
        skill: "Sentiment Analyzer",
        skillId: "sentiment-analyzer",
        result: {
          overallSentiment: String(sentimentData.overallSentiment || "neutral"),
          score: typeof sentimentData.score === "number" ? sentimentData.score : 0,
          confidence: typeof sentimentData.confidence === "number" ? sentimentData.confidence : 0.5,
          emotions: (sentimentData.emotions && typeof sentimentData.emotions === "object")
            ? sentimentData.emotions
            : { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0, anticipation: 0, trust: 0 },
          dominantEmotion: String(sentimentData.dominantEmotion || "neutral"),
          subjectivity: typeof sentimentData.subjectivity === "number" ? sentimentData.subjectivity : 0.5,
          intensity: String(sentimentData.intensity || "medium"),
          keywords: Array.isArray(sentimentData.keywords) ? sentimentData.keywords : [],
          summary: String(sentimentData.summary || "Analysis complete."),
          characterCount: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          analyzedAt: new Date().toISOString(),
        },
        meta: {
          latency: "~1.5s",
          paid: demoMode ? "demo" : "$0.001",
          mode: demoMode ? "demo" : "paid",
          provider: "clawmart.co",
          protocol: "x402",
          model: "gpt-4o-mini",
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
    console.error("Sentiment analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to process sentiment analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    skill: "Sentiment Analyzer",
    endpoint: "https://clawmart.co/api/x402/sentiment-analyzer",
    method: "POST",
    price: "$0.001 per analysis",
    protocol: "x402",
    network: "Base (eip155:8453)",
    asset: "USDC",
    description: "Deep sentiment and emotion analysis for any text. Returns overall sentiment, confidence score, 8-emotion breakdown, subjectivity, and key sentiment drivers.",
    requiredFields: {
      text: "string — text to analyze",
    },
    optionalFields: {},
    example: {
      text: "I absolutely love this product! It exceeded all my expectations and the customer service was phenomenal.",
    },
    responseFormat: {
      overallSentiment: "positive/negative/neutral/mixed",
      score: "-1.0 to 1.0 sentiment score",
      confidence: "0.0 to 1.0 confidence level",
      emotions: "breakdown of 8 emotions (joy, sadness, anger, fear, surprise, disgust, anticipation, trust)",
      dominantEmotion: "strongest detected emotion",
      subjectivity: "0.0 (objective) to 1.0 (subjective)",
      intensity: "low/medium/high",
      keywords: "emotionally significant words/phrases",
      summary: "brief explanation",
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
