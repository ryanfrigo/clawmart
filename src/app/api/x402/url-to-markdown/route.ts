import { NextRequest, NextResponse } from "next/server";

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PRICE_USDC = 0.002; // $0.002 per conversion

/**
 * POST /api/x402/url-to-markdown
 *
 * x402-native endpoint for converting web pages to clean markdown.
 * - No X-PAYMENT header → 402 Payment Required with x402 payment instructions
 * - Valid X-PAYMENT header → fetch URL and convert to markdown
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
            resource: "https://clawmart.co/api/x402/url-to-markdown",
            description: "URL to Markdown — Convert any web page to clean, readable markdown format. Perfect for documentation, note-taking, and content processing.",
            mimeType: "application/json",
            payTo: PAYMENT_ADDRESS,
            maxTimeoutSeconds: 30,
            asset: {
              chainId: 8453,
              assetCode: USDC_BASE,
              displayName: "USDC",
            },
          },
        ],
      },
      { status: 402 }
    );
  }

  // Validate input
  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'url' field. Must be a string." },
      { status: 400 }
    );
  }

  let validUrl: URL;
  try {
    validUrl = new URL(url);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format. Must be a valid HTTP/HTTPS URL." },
      { status: 400 }
    );
  }

  if (!["http:", "https:"].includes(validUrl.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP and HTTPS URLs are supported." },
      { status: 400 }
    );
  }

  try {
    // Fetch the web page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "ClawMart-URLToMarkdown/1.0 (+https://clawmart.co)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { 
          error: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}`,
          statusCode: fetchResponse.status
        },
        { status: 422 }
      );
    }

    const contentType = fetchResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "URL must return HTML content. Content-Type: " + contentType },
        { status: 422 }
      );
    }

    const html = await fetchResponse.text();

    // Use Readability to extract main content
    const { Readability } = await import('@mozilla/readability');
    const { JSDOM } = await import('jsdom');
    
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: "Unable to extract readable content from the provided URL" },
        { status: 422 }
      );
    }

    // Convert HTML to Markdown using turndown
    const TurndownService = await import('turndown');
    const turndown = new TurndownService.default({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    });

    const markdown = turndown.turndown(article.content || '');

    // Get basic page metadata
    const title = article.title || dom.window.document.title || '';
    const description = article.excerpt || '';
    const wordCount = markdown.split(/\s+/).length;
    const characterCount = markdown.length;

    return NextResponse.json({
      title,
      description,
      markdown,
      metadata: {
        url: validUrl.href,
        title,
        description,
        wordCount,
        characterCount,
        extractedAt: new Date().toISOString(),
        lang: dom.window.document.documentElement.lang || null,
      },
      stats: {
        originalBytes: html.length,
        markdownBytes: characterCount,
        compressionRatio: ((html.length - characterCount) / html.length * 100).toFixed(1) + "%",
      }
    });

  } catch (error: unknown) {
    console.error("URL to markdown conversion error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Request timeout: URL took too long to respond" },
          { status: 408 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error during URL processing" },
      { status: 500 }
    );
  }
}

// GET method returns skill info for marketplace discovery
export async function GET() {
  return NextResponse.json({
    skill: "URL to Markdown",
    endpoint: "https://clawmart.co/api/x402/url-to-markdown",
    method: "POST",
    price: "$0.002 per conversion",
    protocol: "x402",
    network: "Base (eip155:8453)",
    asset: "USDC",
    description: "Convert any web page to clean, readable markdown format. Perfect for documentation, note-taking, and content processing. Extracts main content and converts HTML to well-formatted markdown.",
    requiredFields: {
      url: "string — URL to convert (must return HTML content)",
    },
    optionalFields: {},
    example: {
      url: "https://github.com/microsoft/vscode/blob/main/README.md",
    },
    responseFormat: {
      title: "Page title extracted from HTML",
      description: "Meta description or excerpt",
      markdown: "Clean markdown content",
      metadata: {
        url: "Normalized URL",
        title: "Page title",
        description: "Page description",
        wordCount: "Number of words",
        characterCount: "Number of characters",
        extractedAt: "ISO timestamp",
        lang: "Detected language code",
      },
      stats: {
        originalBytes: "Size of original HTML",
        markdownBytes: "Size of generated markdown",
        compressionRatio: "Compression percentage",
      },
    },
    features: [
      "Clean markdown output",
      "Automatic content extraction",
      "Metadata preservation", 
      "Language detection",
      "Compression statistics",
    ],
    useCases: [
      "Documentation generation",
      "Content archiving",
      "Blog post conversion",
      "Research note-taking",
      "API documentation",
    ],
  });
}