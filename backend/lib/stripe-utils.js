/**
 * Stripe configuration and helpers for payment processing
 */

const Stripe = require('stripe');

// Initialize Stripe with test key (use test mode for development)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

/**
 * Create a payment intent for a purchase
 */
async function createPaymentIntent(amount, currency = 'usd', metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return paymentIntent;
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    throw error;
  }
}

/**
 * Confirm a payment intent
 */
async function confirmPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe confirm payment error:', error);
    throw error;
  }
}

/**
 * Create a refund for a charge
 */
async function createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      reason,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Partial refund
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Stripe refund error:', error);
    throw error;
  }
}

/**
 * Retrieve payment intent details
 */
async function getPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe retrieve payment error:', error);
    throw error;
  }
}

/**
 * Calculate platform fee (e.g., 10% of transaction)
 */
function calculatePlatformFee(amount) {
  const feePercentage = 0.10; // 10% platform fee
  return Math.round(amount * feePercentage * 100) / 100;
}

module.exports = {
  stripe,
  createPaymentIntent,
  confirmPaymentIntent,
  createRefund,
  getPaymentIntent,
  calculatePlatformFee,
};
