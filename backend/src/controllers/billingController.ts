import { Request, Response } from 'express';
import { BillingService } from '../services/billingService';
import { AuthenticatedRequest } from '../middleware/auth';

// Billing controller - handles credit management and Stripe payments
export class BillingController {
  /**
   * Get user's current credit balance
   */
  static async getCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const credits = await BillingService.getUserCredits(userId);
      
      res.json({
        success: true,
        data: {
          credits,
          userId
        }
      });
    } catch (error) {
      console.error('Error getting user credits:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREDITS_FETCH_ERROR',
          message: 'Failed to fetch user credits',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get detailed credit statistics for user
   */
  static async getCreditStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await BillingService.getUserCreditStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting credit stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREDIT_STATS_ERROR',
          message: 'Failed to fetch credit statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Purchase credits via Stripe
   */
  static async purchaseCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { amount } = req.body;
      const userId = req.user!.id;
      const userEmail = req.user!.email;
      
      // Validate minimum purchase amount
      if (!amount || amount < 50) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Minimum credit purchase is 50 credits'
          }
        });
        return;
      }

      // Check if Stripe is configured
      const { StripeService } = await import('../services/stripeService');
      
      if (!StripeService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment processing is currently unavailable. Please contact support.'
          }
        });
        return;
      }

      // Calculate pricing
      const pricing = StripeService.calculatePrice(amount);

      // Create payment intent
      const paymentIntent = await StripeService.createPaymentIntent(userId, amount, userEmail);

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
          pricing: {
            credits: pricing.credits,
            pricePerCredit: pricing.pricePerCredit,
            totalPrice: pricing.totalPrice,
            currency: pricing.currency
          }
        }
      });
    } catch (error) {
      console.error('Error purchasing credits:', error);
      
      if (error instanceof Error && error.message.includes('Minimum purchase')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PURCHASE_ERROR',
          message: 'Failed to process credit purchase',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get user's billing history with pagination
   */
  static async getBillingHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PAGINATION',
            message: 'Invalid pagination parameters. Page must be >= 1, limit must be 1-100'
          }
        });
        return;
      }

      const history = await BillingService.getBillingHistory(userId, page, limit);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error getting billing history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BILLING_HISTORY_ERROR',
          message: 'Failed to fetch billing history',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Admin endpoint: Adjust user credits
   */
  static async adminAdjustCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, amount, reason } = req.body;
      const adminUserId = req.user!.id;

      // Validate input
      if (!userId || amount === undefined || !reason) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'userId, amount, and reason are required'
          }
        });
        return;
      }

      if (typeof amount !== 'number' || amount === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a non-zero number'
          }
        });
        return;
      }

      const result = await BillingService.adminAdjustCredits(userId, amount, reason, adminUserId);
      
      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            credits: result.user.credits
          },
          transaction: result.transaction,
          message: `Successfully ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits`
        }
      });
    } catch (error) {
      console.error('Error adjusting credits:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREDIT_ADJUSTMENT_ERROR',
          message: 'Failed to adjust user credits',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Process call completion and deduct credits (internal endpoint for webhooks)
   */
  static async processCallCredits(req: Request, res: Response): Promise<void> {
    try {
      const { userId, callId, durationSeconds, phoneNumber } = req.body;

      // Validate input
      if (!userId || !callId || durationSeconds === undefined || !phoneNumber) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'userId, callId, durationSeconds, and phoneNumber are required'
          }
        });
      }

      const result = await BillingService.processCallCredits(userId, callId, durationSeconds, phoneNumber);
      
      res.json({
        success: true,
        data: {
          creditsUsed: result.creditsUsed,
          remainingCredits: result.user.credits,
          transaction: result.transaction
        }
      });
    } catch (error) {
      console.error('Error processing call credits:', error);
      
      if (error instanceof Error && error.message.includes('Insufficient credits')) {
        res.status(402).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CALL_CREDITS_ERROR',
          message: 'Failed to process call credits',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Check if user has enough credits for a call
   */
  static async checkCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { requiredCredits } = req.query;

      const required = parseInt(requiredCredits as string) || 1;
      const hasEnough = await BillingService.hasEnoughCredits(userId, required);
      const currentCredits = await BillingService.getUserCredits(userId);
      
      res.json({
        success: true,
        data: {
          hasEnoughCredits: hasEnough,
          currentCredits,
          requiredCredits: required
        }
      });
    } catch (error) {
      console.error('Error checking credits:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREDIT_CHECK_ERROR',
          message: 'Failed to check credit balance',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Confirm Stripe payment and add credits
   */
  static async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAYMENT_INTENT',
            message: 'Payment intent ID is required'
          }
        });
      }

      const { StripeService } = await import('../services/stripeService');
      
      if (!StripeService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment processing is currently unavailable'
          }
        });
        return;
      }

      const result = await StripeService.confirmPayment(paymentIntentId);

      res.json({
        success: true,
        data: {
          userId: result.userId,
          creditsAdded: result.creditsAdded,
          transactionId: result.transactionId,
          message: `Successfully added ${result.creditsAdded} credits to your account`
        }
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_CONFIRMATION_ERROR',
          message: 'Failed to confirm payment',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get pricing information
   */
  static async getPricing(req: Request, res: Response): Promise<void> {
    try {
      const { StripeService } = await import('../services/stripeService');
      
      if (!StripeService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment processing is currently unavailable'
          }
        });
        return;
      }

      const pricing = StripeService.getPricingConfig();

      res.json({
        success: true,
        data: {
          pricePerCredit: pricing.pricePerCredit,
          minimumPurchase: pricing.minimumPurchase,
          currency: pricing.currency,
          examples: [
            {
              credits: 50,
              price: 50 * pricing.pricePerCredit
            },
            {
              credits: 100,
              price: 100 * pricing.pricePerCredit
            },
            {
              credits: 500,
              price: 500 * pricing.pricePerCredit
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error getting pricing:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PRICING_ERROR',
          message: 'Failed to fetch pricing information',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get user's Stripe payment history
   */
  static async getPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const { StripeService } = await import('../services/stripeService');
      
      if (!StripeService.isConfigured()) {
        res.status(503).json({
          success: false,
          error: {
            code: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment processing is currently unavailable'
          }
        });
        return;
      }

      const payments = await StripeService.getUserPaymentHistory(userId, limit);

      // Format payment data for frontend
      const formattedPayments = payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created: new Date(payment.created * 1000),
        description: payment.description,
        credits: payment.metadata.creditAmount ? parseInt(payment.metadata.creditAmount) : 0
      }));

      res.json({
        success: true,
        data: {
          payments: formattedPayments,
          total: payments.length
        }
      });
    } catch (error) {
      console.error('Error getting payment history:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PAYMENT_HISTORY_ERROR',
          message: 'Failed to fetch payment history',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}
