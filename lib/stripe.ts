import Stripe from 'stripe';

export { plans } from './plans';

// Initialize Stripe only if the secret key is configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey && stripeSecretKey !== 'sk_test_YOUR_KEY_HERE'
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' as any })
  : null;
