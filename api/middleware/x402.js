/**
 * x402 Payment Middleware for Clawmart
 * Enables HTTP-native crypto payments for skill execution
 */

const crypto = require('crypto');

class X402PaymentMiddleware {
  constructor(options = {}) {
    this.receiverAddress = options.receiverAddress;
    this.supportedTokens = options.supportedTokens || ['USDC', 'USDT'];
    this.defaultChain = options.defaultChain || 'base';
    this.minAmount = options.minAmount || 0.001; // $0.001
    this.maxAmount = options.maxAmount || 100;
    this.paymentStore = new Map(); // In-memory for demo, use Redis in prod
  }

  /**
   * Generate payment requirements header
   */
  generatePaymentRequirements(amount, token = 'USDC') {
    return {
      scheme: 'x402',
      networkId: this.defaultChain,
      requiredAmount: amount.toString(),
      tokenAddress: this.getTokenAddress(token),
      receiverAddress: this.receiverAddress,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      nonce: crypto.randomBytes(16).toString('hex'),
    };
  }

  /**
   * Get token contract address
   */
  getTokenAddress(token) {
    const addresses = {
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
      'USDT': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base USDT
    };
    return addresses[token] || addresses['USDC'];
  }

  /**
   * Verify payment proof
   */
  async verifyPayment(proof, requirements) {
    try {
      // Decode payment proof
      const decoded = JSON.parse(Buffer.from(proof, 'base64').toString());
      
      // Verify signature (simplified - in prod use proper sig verification)
      const isValidSig = await this.verifySignature(decoded);
      
      // Check amount
      const amount = parseFloat(decoded.amount);
      if (amount < parseFloat(requirements.requiredAmount)) {
        return { valid: false, error: 'Insufficient amount' };
      }

      // Check token
      if (decoded.token.toLowerCase() !== requirements.tokenAddress.toLowerCase()) {
        return { valid: false, error: 'Invalid token' };
      }

      // Check receiver
      if (decoded.receiver.toLowerCase() !== requirements.receiverAddress.toLowerCase()) {
        return { valid: false, error: 'Invalid receiver' };
      }

      // Check expiry
      if (decoded.expiresAt < Date.now()) {
        return { valid: false, error: 'Payment expired' };
      }

      // Check for replay
      if (this.paymentStore.has(decoded.nonce)) {
        return { valid: false, error: 'Payment already used' };
      }

      // Store nonce to prevent replay
      this.paymentStore.set(decoded.nonce, {
        amount,
        timestamp: Date.now(),
        txHash: decoded.txHash
      });

      return { 
        valid: true, 
        amount,
        payer: decoded.payer,
        txHash: decoded.txHash
      };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Verify signature (mock implementation)
   */
  async verifySignature(decoded) {
    // In production, use viem/ethers to verify EIP-191 signature
    // For now, accept valid-looking signatures
    return decoded.signature && decoded.signature.length > 10;
  }

  /**
   * Express middleware for payment-protected routes
   */
  requirePayment(amount) {
    return async (req, res, next) => {
      const paymentHeader = req.headers['x-payment-proof'];
      
      if (!paymentHeader) {
        // Return 402 with payment requirements
        const requirements = this.generatePaymentRequirements(amount);
        return res.status(402).json({
          error: 'Payment Required',
          x402: requirements
        });
      }

      // Verify payment
      const requirements = this.generatePaymentRequirements(amount);
      const verification = await this.verifyPayment(paymentHeader, requirements);

      if (!verification.valid) {
        return res.status(402).json({
          error: 'Invalid Payment',
          details: verification.error
        });
      }

      // Attach payment info to request
      req.payment = verification;
      next();
    };
  }

  /**
   * Middleware for optional payment (free tier available)
   */
  optionalPayment(amount) {
    return async (req, res, next) => {
      const paymentHeader = req.headers['x-payment-proof'];
      
      if (paymentHeader) {
        const requirements = this.generatePaymentRequirements(amount);
        const verification = await this.verifyPayment(paymentHeader, requirements);
        
        if (verification.valid) {
          req.payment = verification;
          req.isPaid = true;
        }
      } else {
        req.isPaid = false;
      }
      
      next();
    };
  }
}

module.exports = X402PaymentMiddleware;
