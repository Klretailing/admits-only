import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
import { plans } from '../../../lib/plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured. Add your STRIPE_SECRET_KEY to .env.local to enable payments.',
    });
  }

  const { planId, email } = req.body;
  const plan = plans.find((p) => p.id === planId);

  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AdmitsOnly — ${plan.name}`,
              description: `${plan.audience} • Monthly subscription`,
            },
            unit_amount: plan.price * 100,
            recurring: { interval: plan.interval },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/dashboard?payment=success`,
      cancel_url: `${req.headers.origin}/pricing?payment=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
}
