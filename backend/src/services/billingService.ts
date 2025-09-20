import UserModel, { UserInterface } from '../models/User';
import CreditTransactionModel, { CreditTransactionInterface, CreateCreditTransactionData } from '../models/CreditTransaction';
import { DatabaseService } from './databaseService';

// Billing service - business logic for credit management and billing
export class BillingService {
  /**
   * Get user's current credit balance
   */
  static async getUserCredits(userId: string): Promise<number> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user.credits;
  }

  /**
   * Calculate credits needed for call duration (minute-based rounding)
   * Examples: 2:13 = 3 credits, 1:00 = 1 credit, 0:30 = 1 credit
   */
  static calculateCreditsForDuration(durationSeconds: number): number {
    if (durationSeconds <= 0) return 0;
    
    const minutes = Math.ceil(durationSeconds / 60);
    return minutes;
  }

  /**
   * Deduct credits from user account with transaction logging
   */
  static async deductCredits(
    userId: string, 
    amount: number, 
    description: string,
    callId?: string
  ): Promise<{
    user: UserInterface;
    transaction: CreditTransactionInterface;
  }> {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    // Use database transaction to ensure consistency
    const client = await DatabaseService.getClient();
    
    try {
      await client.query('BEGIN');

      // Get current user with row lock
      const userQuery = 'SELECT * FROM users WHERE id = $1 FOR UPDATE';
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      
      if (user.credits < amount) {
        throw new Error(`Insufficient credits. Required: ${amount}, Available: ${user.credits}`);
      }

      const newBalance = user.credits - amount;

      // Update user credits
      const updateUserQuery = 'UPDATE users SET credits = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      const updatedUserResult = await client.query(updateUserQuery, [newBalance, userId]);
      const updatedUser = updatedUserResult.rows[0];

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        user_id: userId,
        type: 'usage',
        amount: -amount, // Negative for deduction
        balance_after: newBalance,
        description,
        call_id: callId
      };

      const insertTransactionQuery = `
        INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, call_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const transactionResult = await client.query(insertTransactionQuery, [
        transactionData.user_id,
        transactionData.type,
        transactionData.amount,
        transactionData.balance_after,
        transactionData.description,
        transactionData.call_id
      ]);

      await client.query('COMMIT');

      return {
        user: updatedUser,
        transaction: transactionResult.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add credits to user account with transaction logging
   */
  static async addCredits(
    userId: string, 
    amount: number, 
    type: 'purchase' | 'bonus' | 'admin_adjustment' | 'refund',
    description: string,
    stripePaymentId?: string,
    createdBy?: string
  ): Promise<{
    user: UserInterface;
    transaction: CreditTransactionInterface;
  }> {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    // Use database transaction to ensure consistency
    const client = await DatabaseService.getClient();
    
    try {
      await client.query('BEGIN');

      // Get current user with row lock
      const userQuery = 'SELECT * FROM users WHERE id = $1 FOR UPDATE';
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const newBalance = user.credits + amount;

      // Update user credits
      const updateUserQuery = 'UPDATE users SET credits = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      const updatedUserResult = await client.query(updateUserQuery, [newBalance, userId]);
      const updatedUser = updatedUserResult.rows[0];

      // Create transaction record
      const transactionData: CreateCreditTransactionData = {
        user_id: userId,
        type,
        amount,
        balance_after: newBalance,
        description,
        stripe_payment_id: stripePaymentId,
        created_by: createdBy
      };

      const insertTransactionQuery = `
        INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, stripe_payment_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const transactionResult = await client.query(insertTransactionQuery, [
        transactionData.user_id,
        transactionData.type,
        transactionData.amount,
        transactionData.balance_after,
        transactionData.description,
        transactionData.stripe_payment_id,
        transactionData.created_by
      ]);

      await client.query('COMMIT');

      return {
        user: updatedUser,
        transaction: transactionResult.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Grant new user bonus credits (15 credits)
   */
  static async grantNewUserBonus(userId: string): Promise<{
    user: UserInterface;
    transaction: CreditTransactionInterface;
  }> {
    const bonusAmount = 15; // Default bonus for new users
    
    return await this.addCredits(
      userId,
      bonusAmount,
      'bonus',
      'Welcome bonus for new user registration'
    );
  }

  /**
   * Process call completion and deduct credits
   */
  static async processCallCredits(
    userId: string,
    callId: string,
    durationSeconds: number,
    phoneNumber: string
  ): Promise<{
    creditsUsed: number;
    user: UserInterface;
    transaction: CreditTransactionInterface;
  }> {
    const creditsUsed = this.calculateCreditsForDuration(durationSeconds);
    
    if (creditsUsed === 0) {
      // No credits to deduct for very short calls
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        creditsUsed: 0,
        user,
        transaction: null as any // No transaction for 0 credits
      };
    }

    const durationMinutes = Math.ceil(durationSeconds / 60);
    const description = `Call to ${phoneNumber} - ${durationMinutes} minute${durationMinutes > 1 ? 's' : ''}`;

    const result = await this.deductCredits(userId, creditsUsed, description, callId);

    return {
      creditsUsed,
      user: result.user,
      transaction: result.transaction
    };
  }

  /**
   * Get user's billing history with pagination
   */
  static async getBillingHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: CreditTransactionInterface[];
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalPurchased: number;
      totalUsed: number;
      totalBonus: number;
      totalAdjustments: number;
    };
  }> {
    const paginatedResult = await CreditTransactionModel.getUserTransactionsPaginated(userId, page, limit);
    const summary = await CreditTransactionModel.getUserCreditSummary(userId);

    return {
      ...paginatedResult,
      summary: {
        totalPurchased: summary.totalPurchased,
        totalUsed: summary.totalUsed,
        totalBonus: summary.totalBonus,
        totalAdjustments: summary.totalAdjustments
      }
    };
  }

  /**
   * Check if user has sufficient credits
   */
  static async hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);
    return currentCredits >= requiredCredits;
  }

  /**
   * Get users with low credits (for notifications)
   */
  static async getUsersWithLowCredits(threshold: number = 5): Promise<UserInterface[]> {
    return await UserModel.getUsersWithLowCredits(threshold);
  }

  /**
   * Admin function: Adjust user credits
   */
  static async adminAdjustCredits(
    userId: string,
    amount: number,
    reason: string,
    adminUserId: string
  ): Promise<{
    user: UserInterface;
    transaction: CreditTransactionInterface;
  }> {
    const type = amount > 0 ? 'admin_adjustment' : 'admin_adjustment';
    const description = `Admin adjustment: ${reason}`;

    if (amount > 0) {
      return await this.addCredits(userId, amount, type, description, undefined, adminUserId);
    } else {
      // For negative adjustments, we need to handle it carefully
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Allow admin to set credits to 0 even if it would go negative
      const client = await DatabaseService.getClient();
      
      try {
        await client.query('BEGIN');

        const newBalance = Math.max(0, user.credits + amount); // Don't allow negative balance

        // Update user credits
        const updateUserQuery = 'UPDATE users SET credits = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        const updatedUserResult = await client.query(updateUserQuery, [newBalance, userId]);
        const updatedUser = updatedUserResult.rows[0];

        // Create transaction record
        const insertTransactionQuery = `
          INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const transactionResult = await client.query(insertTransactionQuery, [
          userId,
          type,
          amount,
          newBalance,
          description,
          adminUserId
        ]);

        await client.query('COMMIT');

        return {
          user: updatedUser,
          transaction: transactionResult.rows[0]
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  /**
   * Get credit usage statistics for a user
   */
  static async getUserCreditStats(userId: string): Promise<{
    currentBalance: number;
    totalPurchased: number;
    totalUsed: number;
    totalBonus: number;
    averageCallCost: number;
    recentTransactions: CreditTransactionInterface[];
  }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const summary = await CreditTransactionModel.getUserCreditSummary(userId);
    const recentTransactions = await CreditTransactionModel.getUserTransactions(userId, 10);

    // Calculate average call cost
    const usageTransactions = await CreditTransactionModel.getTransactionsByType(userId, 'usage');
    const averageCallCost = usageTransactions.length > 0 
      ? Math.abs(usageTransactions.reduce((sum, t) => sum + t.amount, 0)) / usageTransactions.length
      : 0;

    return {
      currentBalance: user.credits,
      totalPurchased: summary.totalPurchased,
      totalUsed: summary.totalUsed,
      totalBonus: summary.totalBonus,
      averageCallCost: Math.round(averageCallCost * 100) / 100, // Round to 2 decimal places
      recentTransactions
    };
  }
}