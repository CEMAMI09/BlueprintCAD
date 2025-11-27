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
 * Create a subscription for a user
 */
async function createSubscription(customerId, priceId, metadata = {}) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Stripe create subscription error:', error);
    throw error;
  }
}

/**
 * Get a subscription by ID
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Stripe get subscription error:', error);
    throw error;
  }
}

/**
 * Update a subscription (change plan)
 */
async function updateSubscription(subscriptionId, newPriceId, metadata = {}) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      metadata,
      proration_behavior: 'always_invoice',
    });

    return updated;
  } catch (error) {
    console.error('Stripe update subscription error:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, cancelImmediately = false) {
  try {
    if (cancelImmediately) {
      return await stripe.subscriptions.cancel(subscriptionId);
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    console.error('Stripe cancel subscription error:', error);
    throw error;
  }
}

/**
 * Create or retrieve a Stripe customer
 */
async function getOrCreateCustomer(email, userId, metadata = {}) {
  try {
    // Try to find existing customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId: userId.toString(),
        ...metadata,
      },
    });

    return customer;
  } catch (error) {
    console.error('Stripe get/create customer error:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
async function createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    return session;
  } catch (error) {
    console.error('Stripe create checkout session error:', error);
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
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getOrCreateCustomer,
  createCheckoutSession,
};
