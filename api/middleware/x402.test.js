/**
 * Tests for x402 Payment Middleware
 */

const X402PaymentMiddleware = require('../middleware/x402');

describe('X402 Payment Middleware', () => {
  let middleware;

  beforeEach(() => {
    middleware = new X402PaymentMiddleware({
      receiverAddress: '0x1234567890123456789012345678901234567890',
      supportedTokens: ['USDC'],
      defaultChain: 'base'
    });
  });

  test('generates payment requirements', () => {
    const requirements = middleware.generatePaymentRequirements(0.001, 'USDC');
    
    expect(requirements.scheme).toBe('x402');
    expect(requirements.networkId).toBe('base');
    expect(requirements.requiredAmount).toBe('0.001');
    expect(requirements.tokenAddress).toBeDefined();
    expect(requirements.receiverAddress).toBe('0x1234567890123456789012345678901234567890');
    expect(requirements.expiresAt).toBeGreaterThan(Date.now());
    expect(requirements.nonce).toBeDefined();
  });

  test('verifies valid payment proof', async () => {
    const requirements = middleware.generatePaymentRequirements(0.001);
    
    const paymentProof = Buffer.from(JSON.stringify({
      amount: '0.001',
      token: requirements.tokenAddress,
      receiver: requirements.receiverAddress,
      expiresAt: Date.now() + 60000,
      nonce: requirements.nonce,
      signature: '0xvalidsignature123',
      txHash: '0xtxhash123',
      payer: '0xpayeraddress'
    })).toString('base64');

    const result = await middleware.verifyPayment(paymentProof, requirements);
    
    expect(result.valid).toBe(true);
    expect(result.amount).toBe(0.001);
    expect(result.payer).toBe('0xpayeraddress');
  });

  test('rejects insufficient amount', async () => {
    const requirements = middleware.generatePaymentRequirements(0.001);
    
    const paymentProof = Buffer.from(JSON.stringify({
      amount: '0.0001',
      token: requirements.tokenAddress,
      receiver: requirements.receiverAddress,
      expiresAt: Date.now() + 60000,
      nonce: requirements.nonce,
      signature: '0xvalidsignature123',
      txHash: '0xtxhash123'
    })).toString('base64');

    const result = await middleware.verifyPayment(paymentProof, requirements);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Insufficient amount');
  });

  test('rejects expired payment', async () => {
    const requirements = middleware.generatePaymentRequirements(0.001);
    
    const paymentProof = Buffer.from(JSON.stringify({
      amount: '0.001',
      token: requirements.tokenAddress,
      receiver: requirements.receiverAddress,
      expiresAt: Date.now() - 60000, // Expired
      nonce: requirements.nonce,
      signature: '0xvalidsignature123',
      txHash: '0xtxhash123'
    })).toString('base64');

    const result = await middleware.verifyPayment(paymentProof, requirements);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Payment expired');
  });

  test('rejects replay attack', async () => {
    const requirements = middleware.generatePaymentRequirements(0.001);
    
    const paymentProof = Buffer.from(JSON.stringify({
      amount: '0.001',
      token: requirements.tokenAddress,
      receiver: requirements.receiverAddress,
      expiresAt: Date.now() + 60000,
      nonce: requirements.nonce,
      signature: '0xvalidsignature123',
      txHash: '0xtxhash123'
    })).toString('base64');

    // First verification should succeed
    const result1 = await middleware.verifyPayment(paymentProof, requirements);
    expect(result1.valid).toBe(true);

    // Second verification should fail (replay)
    const result2 = await middleware.verifyPayment(paymentProof, requirements);
    expect(result2.valid).toBe(false);
    expect(result2.error).toBe('Payment already used');
  });
});
