/**
 * x402 Protocol Implementation for ClawMart
 * 
 * HTTP 402 Payment Required - turns any API into a paid service.
 * Agent calls endpoint → gets 402 response → pays in USDC → gets result.
 */

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0xClawMartPaymentAddress123";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export interface X402PaymentRequired {
  x402Version: 1;
  accepts: PaymentOption[];
}

export interface PaymentOption {
  scheme: "exact";
  network: "eip155:8453"; // Base mainnet
  maxAmountRequired: string; // USDC amount in wei (6 decimals)
  resource: string; // API endpoint URL
  description: string; // Human-readable description
  mimeType: "application/json";
  payTo: string; // Payment receiving address
  maxTimeoutSeconds: number;
  asset: string; // USDC contract address
  extra: {
    name: string;
    version: string;
    priceDisplay: string;
    provider: string;
  };
}

/**
 * Create x402 Payment Required response
 */
export function createX402Response(
  endpoint: string,
  skillName: string,
  description: string,
  priceUSD: number
): X402PaymentRequired {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        maxAmountRequired: String(Math.floor(priceUSD * 1e6)), // Convert USD to USDC wei
        resource: endpoint,
        description: `${skillName} — ${description}`,
        mimeType: "application/json",
        payTo: PAYMENT_ADDRESS,
        maxTimeoutSeconds: 300,
        asset: USDC_BASE,
        extra: {
          name: skillName,
          version: "1",
          priceDisplay: `$${priceUSD} per call`,
          provider: "clawmart.co",
        },
      },
    ],
  };
}

/**
 * Validate payment proof (simplified for demo)
 */
export function validatePayment(paymentHeader: string): boolean {
  // In production, this would:
  // 1. Parse the payment proof
  // 2. Verify the blockchain transaction
  // 3. Check amount and recipient
  // 4. Ensure payment is recent and not replayed
  
  // For demo, accept any non-empty payment header
  return typeof paymentHeader === "string" && paymentHeader.length > 0;
}

/**
 * x402 middleware for Next.js API routes
 */
export function withX402Payment(
  handler: (body: any) => Promise<any>,
  options: {
    skillName: string;
    description: string;
    priceUSD: number;
  }
) {
  return async (request: Request) => {
    const paymentHeader = request.headers.get("X-PAYMENT");
    const demoMode = request.headers.get("X-Demo") === "true";
    const url = new URL(request.url);

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON
    }

    // Demo mode - free execution
    if (demoMode) {
      const result = await handler(body);
      return new Response(JSON.stringify({ result }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo",
        },
      });
    }

    // No payment - return 402 Payment Required
    if (!paymentHeader || !validatePayment(paymentHeader)) {
      const x402Response = createX402Response(
        url.toString(),
        options.skillName,
        options.description,
        options.priceUSD
      );

      return new Response(JSON.stringify(x402Response), {
        status: 402,
        headers: {
          "X-PAYMENT-REQUIRED": "true",
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo",
        },
      });
    }

    // Valid payment - execute skill
    const result = await handler(body);
    return new Response(JSON.stringify({ result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Demo",
      },
    });
  };
}