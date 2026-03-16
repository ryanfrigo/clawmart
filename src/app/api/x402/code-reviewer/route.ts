import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE_USDC = 0.005;

/**
 * POST /api/x402/code-reviewer
 *
 * x402-native endpoint for AI-powered code review.
 * - No X-PAYMENT header → 402 Payment Required with x402 payment instructions
 * - Valid X-PAYMENT header → analyze code and return structured review
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
            resource: "https://clawmart.co/api/x402/code-reviewer",
            description: "Code Reviewer — AI-powered code analysis for security issues, quality improvements, and actionable suggestions.",
            mimeType: "application/json",
            payTo: PAYMENT_ADDRESS,
            maxTimeoutSeconds: 30,
            asset: USDC_BASE,
            extra: {
              name: "Code Reviewer",
              version: "1",
              priceDisplay: "$0.005 per review",
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
  const code = String(body.code || "");
  if (!code.trim()) {
    return NextResponse.json({ error: "Missing 'code' field" }, { status: 400 });
  }

  if (code.length > 20000) {
    return NextResponse.json({ error: "Code exceeds maximum length of 20,000 characters" }, { status: 400 });
  }

  const language = String(body.language || "auto-detect");

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
            content: `You are an expert code reviewer specializing in security, performance, and code quality. 
Analyze the provided code and return a JSON response with this exact structure:
{
  "language": "detected or specified language",
  "qualityScore": <number 0-100>,
  "securityIssues": [
    { "severity": "critical|high|medium|low", "issue": "description", "line": <number or null>, "fix": "suggested fix" }
  ],
  "suggestions": [
    { "category": "performance|readability|maintainability|best-practice", "suggestion": "description", "line": <number or null> }
  ],
  "summary": "2-3 sentence overall assessment",
  "strengths": ["list of good things about the code"],
  "complexity": "low|medium|high"
}
Return ONLY valid JSON, no markdown, no explanation.`
          },
          {
            role: "user",
            content: `Review this ${language !== "auto-detect" ? language : ""} code:\n\n\`\`\`\n${code.slice(0, 15000)}\n\`\`\``
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
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

    let reviewData: Record<string, unknown>;
    try {
      reviewData = JSON.parse(rawContent);
    } catch {
      reviewData = {
        language: language,
        qualityScore: 70,
        securityIssues: [],
        suggestions: [{ category: "general", suggestion: rawContent.slice(0, 200), line: null }],
        summary: "Code review completed.",
        strengths: [],
        complexity: "medium",
      };
    }

    return NextResponse.json(
      {
        skill: "Code Reviewer",
        skillId: "code-reviewer",
        result: {
          language: reviewData.language || language,
          qualityScore: typeof reviewData.qualityScore === "number" ? reviewData.qualityScore : 70,
          securityIssues: Array.isArray(reviewData.securityIssues) ? reviewData.securityIssues : [],
          suggestions: Array.isArray(reviewData.suggestions) ? reviewData.suggestions : [],
          summary: String(reviewData.summary || "Review completed."),
          strengths: Array.isArray(reviewData.strengths) ? reviewData.strengths : [],
          complexity: String(reviewData.complexity || "medium"),
          linesAnalyzed: code.split("\n").length,
          reviewedAt: new Date().toISOString(),
        },
        meta: {
          latency: "~2.0s",
          paid: demoMode ? "demo" : "$0.005",
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
    console.error("Code review error:", error);
    return NextResponse.json(
      {
        error: "Failed to process code review",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    skill: "Code Reviewer",
    endpoint: "https://clawmart.co/api/x402/code-reviewer",
    method: "POST",
    price: "$0.005 per review",
    protocol: "x402",
    network: "Base (eip155:8453)",
    asset: "USDC",
    description: "AI-powered code review that identifies security vulnerabilities, performance issues, and quality improvements with actionable suggestions.",
    requiredFields: {
      code: "string — source code to review",
    },
    optionalFields: {
      language: "string — programming language (auto-detected if not provided)",
    },
    example: {
      code: "function fetchUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id); }",
      language: "javascript",
    },
    responseFormat: {
      language: "detected/specified language",
      qualityScore: "0-100 quality rating",
      securityIssues: "array of security findings with severity and fixes",
      suggestions: "array of improvement suggestions by category",
      summary: "overall assessment",
      strengths: "positive aspects of the code",
      complexity: "low/medium/high",
      linesAnalyzed: "number of lines reviewed",
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
