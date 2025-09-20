import Stripe from 'stripe';
import { BillingService } from './billingService';
import CreditTransactionModel from '../models/CreditTransaction';

export class StripeService {
  private static stripe: Stripe | null = null;

  /**
   * Initialize Stripe with API key
   */
  static initialize(): void {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      console.warn('Stripe secret key not configured. Payment functionality will be disabled.');
      return;
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    console.log('Stripe service initialized successfully');
  }

  /**
   * Get Stripe instance
   */
  static getStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe not initialized. Please configure STRIPE_SECRET_KEY environment variable.');
    }
    return this.stripe;
  }

  /**
   * Check if Stripe is configured
   */
  static isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  /**
   * Create a payment intent for credit purchase
   */
  static async createPaymentIntent(
    userId: string,
    creditAmount: number,
    userEmail: string
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    // Validate minimum credit purchase
    if (creditAmount < 50) {
      throw new Error('Minimum credit purchase is 50 credits');
    }

    // Calculate price (assuming $1 per credit for now - this should be configurable)
    const pricePerCredit = 1; // $1 per credit
    const amountInCents = creditAmount * pricePerCredit * 100; // Convert to cents

    const stripe = this.getStripe();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          userId,
          creditAmount: creditAmount.toString(),
          type: 'credit_purchase'
        },
        receipt_email: userEmail,
        description: `Purchase of ${creditAmount} credits`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: amountInCents,
        currency: 'usd'
      };
    } catch (error) {
      console.error('Error creating Stripe payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Confirm payment and process credit addition
   */
  static async confirmPayment(paymentIntentId: string): Promise<{
    success: boolean;
    userId: string;
    creditsAdded: number;
    transactionId: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = this.getStripe();

    try {
      // Retrieve payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
      }

      const userId = paymentIntent.metadata.userId;
      const creditAmount = parseInt(paymentIntent.metadata.creditAmount);

      if (!userId || !creditAmount) {
        throw new Error('Invalid payment metadata');
      }

      // Check if we already processed this payment
      const existingTransaction = await CreditTransactionModel.getByStripePaymentId(paymentIntentId);
      if (existingTransaction) {
        console.log(`Payment ${paymentIntentId} already processed`);
        return {
          success: true,
          userId,
          creditsAdded: creditAmount,
          transactionId: existingTransaction.id
        };
      }

      // Add credits to user account
      const result = await BillingService.addCredits(
        userId,
        creditAmount,
        'purchase',
        `Credit purchase via Stripe - ${creditAmount} credits`,
        paymentIntentId
      );

      console.log(`Successfully processed payment ${paymentIntentId}: ${creditAmount} credits added to user ${userId}`);

      return {
        success: true,
        userId,
        creditsAdded: creditAmount,
        transactionId: result.transaction.id
      };

    } catch (error) {
      console.error('Error confirming Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(
    body: string | Buffer,
    signature: string
  ): Promise<{
    processed: boolean;
    eventType: string;
    paymentIntentId?: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    const stripe = this.getStripe();

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

      console.log(`Received Stripe webhook: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Only process credit purchase payments
          if (paymentIntent.metadata.type === 'credit_purchase') {
            try {
              const result = await this.confirmPayment(paymentIntent.id);
              console.log(`Webhook processed payment: ${paymentIntent.id}`);
              
              return {
                processed: true,
                eventType: event.type,
                paymentIntentId: paymentIntent.id
              };
            } catch (error) {
              console.error(`Error processing webhook payment ${paymentIntent.id}:`, error);
              // Don't throw here - we want to acknowledge the webhook even if processing fails
              // The payment can be manually processed later
            }
          }
        }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          console.log(`Payment failed: ${failedPayment.id}`, failedPayment.last_payment_error);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return {
        processed: true,
        eventType: event.type
      };

    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a user
   */
  static async getUserPaymentHistory(
    userId: string,
    limit: number = 10
  ): Promise<Stripe.PaymentIntent[]> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = this.getStripe();

    try {
      const paymentIntents = await stripe.paymentIntents.list({
        limit,
        expand: ['data.charges'],
      });

      // Filter by user ID in metadata
      const userPayments = paymentIntents.data.filter(
        pi => pi.metadata.userId === userId && pi.metadata.type === 'credit_purchase'
      );

      return userPayments;
    } catch (error) {
      console.error('Error fetching user payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentIntentId: string,
    reason: string = 'requested_by_customer'
  ): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const stripe = this.getStripe();

    try {
      // Get the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Cannot refund unsuccessful payment');
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          original_user_id: paymentIntent.metadata.userId,
          original_credit_amount: paymentIntent.metadata.creditAmount
        }
      });

      // Deduct credits from user account
      const userId = paymentIntent.metadata.userId;
      const creditAmount = parseInt(paymentIntent.metadata.creditAmount);

      if (userId && creditAmount) {
        try {
          await BillingService.addCredits(
            userId,
            -creditAmount, // Negative to deduct
            'refund',
            `Refund for Stripe payment ${paymentIntentId}`,
            paymentIntentId
          );
        } catch (error) {
          console.error('Error deducting credits for refund:', error);
          // Continue with refund even if credit deduction fails
          // This can be handled manually by admin
        }
      }

      console.log(`Refund processed: ${refund.id} for payment ${paymentIntentId}`);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount
      };

    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get pricing configuration (this should be moved to database/config later)
   */
  static getPricingConfig(): {
    pricePerCredit: number;
    minimumPurchase: number;
    currency: string;
  } {
    return {
      pricePerCredit: 1, // $1 per credit
      minimumPurchase: 50, // 50 credits minimum
      currency: 'usd'
    };
  }

  /**
   * Calculate total price for credit purchase
   */
  static calculatePrice(creditAmount: number): {
    credits: number;
    pricePerCredit: number;
    totalPrice: number;
    totalPriceCents: number;
    currency: string;
  } {
    const config = this.getPricingConfig();
    
    if (creditAmount < config.minimumPurchase) {
      throw new Error(`Minimum purchase is ${config.minimumPurchase} credits`);
    }

    const totalPrice = creditAmount * config.pricePerCredit;
    const totalPriceCents = totalPrice * 100;

    return {
      credits: creditAmount,
      pricePerCredit: config.pricePerCredit,
      totalPrice,
      totalPriceCents,
      currency: config.currency
    };
  }
}

// Initialize Stripe on module load
StripeService.initialize();