import BaseModel, { BaseModelInterface } from './BaseModel';

// Credit Transaction model - defines credit transaction data structure
export interface CreditTransactionInterface extends BaseModelInterface {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'bonus' | 'admin_adjustment' | 'refund';
  amount: number;
  balance_after: number;
  description: string;
  stripe_payment_id?: string;
  call_id?: string;
  created_by?: string; // For admin adjustments
  created_at: Date;
}

export interface CreateCreditTransactionData {
  user_id: string;
  type: 'purchase' | 'usage' | 'bonus' | 'admin_adjustment' | 'refund';
  amount: number;
  balance_after: number;
  description: string;
  stripe_payment_id?: string;
  call_id?: string;
  created_by?: string;
}

export class CreditTransactionModel extends BaseModel<CreditTransactionInterface> {
  constructor() {
    super('credit_transactions');
  }

  /**
   * Create a new credit transaction
   */
  async createTransaction(data: CreateCreditTransactionData): Promise<CreditTransactionInterface> {
    return await this.create(data);
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<CreditTransactionInterface[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get user's transaction history with pagination info
   */
  async getUserTransactionsPaginated(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: CreditTransactionInterface[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = $1`;
    const countResult = await this.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get transactions
    const transactions = await this.getUserTransactions(userId, limit, offset);
    
    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get transactions by type
   */
  async getTransactionsByType(
    userId: string,
    type: CreditTransactionInterface['type']
  ): Promise<CreditTransactionInterface[]> {
    return await this.findBy({ user_id: userId, type });
  }

  /**
   * Get total credits purchased by user
   */
  async getTotalCreditsPurchased(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM ${this.tableName}
      WHERE user_id = $1 AND type = 'purchase'
    `;
    
    const result = await this.query(query, [userId]);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get total credits used by user
   */
  async getTotalCreditsUsed(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM ${this.tableName}
      WHERE user_id = $1 AND type = 'usage'
    `;
    
    const result = await this.query(query, [userId]);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get transaction by Stripe payment ID
   */
  async getByStripePaymentId(stripePaymentId: string): Promise<CreditTransactionInterface | null> {
    return await this.findOne({ stripe_payment_id: stripePaymentId });
  }

  /**
   * Get transactions for a specific call
   */
  async getCallTransactions(callId: string): Promise<CreditTransactionInterface[]> {
    return await this.findBy({ call_id: callId });
  }

  /**
   * Get user's credit summary
   */
  async getUserCreditSummary(userId: string): Promise<{
    totalPurchased: number;
    totalUsed: number;
    totalBonus: number;
    totalAdjustments: number;
    transactionCount: number;
  }> {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0) as total_purchased,
        COALESCE(SUM(CASE WHEN type = 'usage' THEN ABS(amount) ELSE 0 END), 0) as total_used,
        COALESCE(SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END), 0) as total_bonus,
        COALESCE(SUM(CASE WHEN type = 'admin_adjustment' THEN amount ELSE 0 END), 0) as total_adjustments,
        COUNT(*) as transaction_count
      FROM ${this.tableName}
      WHERE user_id = $1
    `;
    
    const result = await this.query(query, [userId]);
    const row = result.rows[0];
    
    return {
      totalPurchased: parseInt(row.total_purchased),
      totalUsed: parseInt(row.total_used),
      totalBonus: parseInt(row.total_bonus),
      totalAdjustments: parseInt(row.total_adjustments),
      transactionCount: parseInt(row.transaction_count)
    };
  }

  /**
   * Get recent transactions across all users (for admin)
   */
  async getRecentTransactions(limit: number = 100): Promise<CreditTransactionInterface[]> {
    const query = `
      SELECT ct.*, u.email, u.name as user_name
      FROM ${this.tableName} ct
      JOIN users u ON ct.user_id = u.id
      ORDER BY ct.created_at DESC
      LIMIT $1
    `;
    
    const result = await this.query(query, [limit]);
    return result.rows;
  }
}

export default new CreditTransactionModel();