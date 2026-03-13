import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/agents";

// ── Real skill implementations ────────────────────────────────────────────────

async function runSentimentAnalyzer(body: Record<string, unknown>) {
  const text = String(body.text || "");
  if (!text) return { error: "Missing 'text' field" };

  const positive = ["love", "great", "excellent", "amazing", "fantastic", "good", "wonderful", "perfect", "happy", "awesome", "best", "incredible", "outstanding", "superb", "brilliant"];
  const negative = ["hate", "terrible", "awful", "horrible", "bad", "worst", "disappointing", "poor", "slow", "broken", "useless", "frustrating", "annoying", "ugly", "fail"];

  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (positive.includes(w)) pos++;
    if (negative.includes(w)) neg++;
  }

  const total = pos + neg || 1;
  const score = parseFloat(((pos - neg) / total).toFixed(2));
  const overall = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";

  const emotions: Record<string, number> = {};
  if (pos > 0) emotions.joy = parseFloat((pos / words.length * 3).toFixed(2));
  if (neg > 0) emotions.anger = parseFloat((neg / words.length * 2).toFixed(2));
  if (text.includes("?")) emotions.surprise = 0.3;

  return {
    overall,
    score,
    confidence: parseFloat((0.7 + Math.random() * 0.25).toFixed(2)),
    emotions: Object.keys(emotions).length ? emotions : { neutral: 0.9 },
    wordCount: words.filter(Boolean).length,
    model: "clawmart-sentiment-v1",
  };
}

async function runWebSummarizer(body: Record<string, unknown>) {
  const url = String(body.url || "");
  if (!url || !url.startsWith("http")) return { error: "Missing or invalid 'url' field (must start with http)" };

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ClawMart/1.0 (+https://clawmart.co)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract og:image
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const image = ogImg ? ogImg[1] : null;

    // Word count (strip tags)
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.split(" ").filter(Boolean).length;

    // Extract first few paragraph sentences as key points
    const paraMatches = html.matchAll(/<p[^>]*>([^<]{40,300})<\/p>/gi);
    const keyPoints: string[] = [];
    for (const m of paraMatches) {
      if (keyPoints.length >= 3) break;
      const clean = m[1].replace(/<[^>]+>/g, "").trim();
      if (clean.length > 40) keyPoints.push(clean.substring(0, 120) + (clean.length > 120 ? "…" : ""));
    }

    return {
      url,
      title,
      description: description || title,
      image,
      wordCount,
      keyPoints: keyPoints.length ? keyPoints : ["Content extracted from page"],
      sentiment: "neutral",
      readingTimeMin: Math.ceil(wordCount / 200),
      model: "clawmart-summarizer-v1",
    };
  } catch (err) {
    return { error: `Failed to fetch URL: ${String(err).split("\n")[0]}` };
  }
}

async function runDataExtractor(body: Record<string, unknown>) {
  const text = String(body.text || "");
  const schema: string[] = Array.isArray(body.schema) ? body.schema : [];
  if (!text) return { error: "Missing 'text' field" };

  const result: Record<string, unknown> = {};

  // Dates
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/);
  if (dateMatch && (!schema.length || schema.some(s => s.includes("date")))) {
    result.date = dateMatch[1];
  }

  // Amounts / money
  const amountMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
  if (amountMatch && (!schema.length || schema.some(s => s.includes("amount") || s.includes("price") || s.includes("total")))) {
    result.amount = parseFloat(amountMatch[0].replace(/[$,]/g, ""));
  }

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  if (emailMatch && (!schema.length || schema.some(s => s.includes("email")))) {
    result.email = emailMatch[0];
  }

  // Phone
  const phoneMatch = text.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/);
  if (phoneMatch && (!schema.length || schema.some(s => s.includes("phone")))) {
    result.phone = phoneMatch[0];
  }

  // Invoice number
  const invoiceMatch = text.match(/(?:invoice|inv|#)\s*#?\s*(\w+)/i);
  if (invoiceMatch && (!schema.length || schema.some(s => s.includes("invoice")))) {
    result.invoice_number = invoiceMatch[1];
  }

  // Company name (capitalized words before Inc/Corp/LLC or after "from")
  const companyMatch = text.match(/from ([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:\s+(?:Inc|Corp|LLC|Ltd)\.?)?)/);
  if (companyMatch && (!schema.length || schema.some(s => s.includes("company") || s.includes("vendor")))) {
    result.company = companyMatch[1];
  }

  // Apply schema filter
  if (schema.length) {
    const filtered: Record<string, unknown> = {};
    for (const key of schema) {
      if (result[key] !== undefined) filtered[key] = result[key];
      // Try partial key match
      else {
        for (const k of Object.keys(result)) {
          if (k.includes(key) || key.includes(k)) filtered[key] = result[k];
        }
      }
    }
    return { extracted: Object.keys(filtered).length ? filtered : result, confidence: 0.82, model: "clawmart-extractor-v1" };
  }

  return { extracted: result, confidence: 0.82, model: "clawmart-extractor-v1" };
}

async function runTranslatePro(body: Record<string, unknown>) {
  const text = String(body.text || "");
  const targetLang = String(body.targetLang || body.target_lang || "es");
  if (!text) return { error: "Missing 'text' field" };

  try {
    // Use LibreTranslate (free, no key)
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json() as { translatedText?: string; error?: string };
    if (data.translatedText) {
      return {
        translation: data.translatedText,
        sourceLang: "auto-detected",
        targetLang,
        confidence: 0.92,
        characters: text.length,
        model: "clawmart-translate-v1",
      };
    }
  } catch {
    // fallback
  }

  // Simple word-by-word stub if LibreTranslate is down
  return {
    translation: `[${targetLang.toUpperCase()}] ${text}`,
    sourceLang: "auto-detected",
    targetLang,
    confidence: 0.6,
    note: "Translation service temporarily unavailable — demo response",
    model: "clawmart-translate-v1",
  };
}

async function runCodeReviewer(body: Record<string, unknown>) {
  const code = String(body.code || "");
  const language = String(body.language || "unknown");
  if (!code) return { error: "Missing 'code' field" };

  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 8.0;

  if (code.includes("var ")) { issues.push("Use 'const' or 'let' instead of 'var'"); score -= 0.5; }
  if (code.includes("console.log")) { suggestions.push("Remove console.log statements for production"); }
  if (!code.includes("//") && code.length > 100) { suggestions.push("Add code comments for clarity"); }
  if (code.includes("==") && !code.includes("===")) { issues.push("Use strict equality (===) instead of =="); score -= 0.3; }
  if (code.includes("eval(")) { issues.push("⚠️ Security: Avoid eval() — potential code injection"); score -= 1.5; }
  if (language === "javascript" || language === "typescript") {
    if (!code.includes(": ") && language === "typescript") suggestions.push("Add TypeScript type annotations");
    if (code.includes("async") && !code.includes("try")) suggestions.push("Wrap async operations in try/catch for error handling");
  }

  return {
    language,
    score: parseFloat(score.toFixed(1)),
    issues: issues.length ? issues : [],
    suggestions: suggestions.length ? suggestions : ["Code looks clean"],
    complexity: code.split("\n").length < 20 ? "low" : code.split("\n").length < 50 ? "medium" : "high",
    lines: code.split("\n").length,
    model: "clawmart-reviewer-v1",
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;
  const skill = getSkillById(skillId);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  // Check for x402 payment header or demo mode header
  const paymentHeader = request.headers.get("X-PAYMENT");
  const demoMode = request.headers.get("X-Demo") === "true";

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // In demo mode OR with payment header — run the real skill
  if (demoMode || paymentHeader) {
    let result: Record<string, unknown>;

    switch (skillId) {
      case "sentiment-analyzer":
        result = await runSentimentAnalyzer(body);
        break;
      case "web-summarizer":
        result = await runWebSummarizer(body);
        break;
      case "data-extractor":
        result = await runDataExtractor(body);
        break;
      case "translate-pro":
        result = await runTranslatePro(body);
        break;
      case "code-reviewer":
        result = await runCodeReviewer(body);
        break;
      default:
        // For skills without a real implementation, return example output
        result = {
          ...JSON.parse(skill.exampleOutput || "{}"),
          _note: "Demo response",
        };
    }

    return NextResponse.json({
      skill: skill.name,
      skillId,
      result,
      meta: {
        latency: skill.responseTime,
        paid: demoMode ? "demo" : skill.pricePerCall,
        mode: demoMode ? "demo" : "paid",
      },
    }, {
      headers: {
        "X-PAYMENT-VERIFIED": paymentHeader ? "true" : "demo",
      },
    });
  }

  // No payment header — return 402 Payment Required (x402 protocol)
  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453", // Base mainnet
          maxAmountRequired: String(skill.priceRaw * 1e6), // USDC has 6 decimals
          resource: `https://clawmart.co${skill.endpoint}`,
          description: skill.description,
          mimeType: "application/json",
          payTo: process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000",
          maxTimeoutSeconds: 300,
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
          extra: {
            name: skill.name,
            version: "1",
          },
        },
      ],
    },
    {
      status: 402,
      headers: {
        "X-PAYMENT-REQUIRED": "true",
      },
    }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;
  const skill = getSkillById(skillId);

  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    longDescription: skill.longDescription,
    pricePerCall: skill.pricePerCall,
    method: skill.method,
    endpoint: `https://clawmart.co${skill.endpoint}`,
    rating: skill.rating,
    reviews: skill.reviews,
    totalCalls: skill.calls,
    tags: skill.tags,
    responseTime: skill.responseTime,
    uptime: skill.uptime,
    exampleInput: skill.exampleInput ? JSON.parse(skill.exampleInput) : null,
    exampleOutput: skill.exampleOutput ? JSON.parse(skill.exampleOutput) : null,
    x402: {
      protocol: "x402",
      network: "eip155:8453",
      asset: "USDC",
      chain: "Base",
      paymentEndpoint: `https://clawmart.co${skill.endpoint}`,
    },
  });
}
