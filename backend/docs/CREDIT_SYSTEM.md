# Credit System and Billing Documentation

## Overview

The AI Calling Agent SaaS platform uses a credit-based billing system where users consume credits for making calls. The system integrates with Stripe for payment processing and provides comprehensive transaction logging.

## Credit System Features

### Credit Management
- **New User Bonus**: 15 free credits automatically granted upon registration
- **Credit Deduction**: 1 credit per minute of call time (rounded up)
- **Transaction Logging**: All credit movements are tracked with detailed transaction records
- **Balance Protection**: Users cannot make calls without sufficient credits

### Credit Calculation Examples
- 30 seconds call = 1 credit (rounded up)
- 1 minute call = 1 credit
- 2 minutes 13 seconds call = 3 credits (rounded up)
- 5 minutes exact = 5 credits

## Stripe Payment Integration

### Payment Flow
1. User initiates credit purchase (minimum 50 credits)
2. System creates Stripe Payment Intent
3. Frontend handles payment with Stripe Elements
4. Webhook confirms successful payment
5. Credits are automatically added to user account

### Pricing Configuration
- **Price per Credit**: $1.00 USD
- **Minimum Purchase**: 50 credits
- **Currency**: USD
- **Payment Methods**: All Stripe-supported methods (cards, digital wallets, etc.)

### Webhook Security
- Stripe webhook signature verification
- Duplicate payment prevention
- Automatic retry handling for failed webhook processing

## API Endpoints

### Credit Management
- `GET /api/billing/credits` - Get current credit balance
- `GET /api/billing/stats` - Get detailed credit statistics
- `GET /api/billing/history` - Get paginated transaction history
- `GET /api/billing/check` - Check if user has sufficient credits

### Payment Processing
- `POST /api/billing/purchase` - Create payment intent for credit purchase
- `POST /api/billing/confirm-payment` - Confirm payment and add credits
- `GET /api/billing/pricing` - Get current pricing information
- `GET /api/billing/payment-history` - Get Stripe payment history

### Internal/Webhook Endpoints
- `POST /api/billing/process-call` - Process call completion and deduct credits
- `POST /api/webhooks/stripe` - Handle Stripe webhook events

### Admin Endpoints
- `POST /api/billing/admin/adjust` - Manually adjust user credits (admin only)

## Database Schema

### Credit Transactions Table
```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'admin_adjustment', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    description TEXT NOT NULL,
    stripe_payment_id VARCHAR(255),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### Transaction Types
- **purchase**: Credits purchased via Stripe
- **usage**: Credits consumed for calls
- **bonus**: Free credits (new user bonus, promotions)
- **admin_adjustment**: Manual credit adjustments by admin
- **refund**: Credits refunded due to payment refund

## Environment Variables

### Required for Stripe Integration
```env
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional Configuration
```env
STRIPE_PUBLISHABLE_KEY=pk_live_... # Used by frontend
```

## Error Handling

### Common Error Codes
- `INSUFFICIENT_CREDITS`: User doesn't have enough credits for operation
- `STRIPE_NOT_CONFIGURED`: Stripe credentials not set up
- `INVALID_AMOUNT`: Credit amount below minimum or invalid
- `PAYMENT_CONFIRMATION_ERROR`: Failed to confirm Stripe payment
- `CREDIT_ADJUSTMENT_ERROR`: Failed to adjust credits (admin operation)

### Webhook Error Handling
- Invalid signature: Returns 400 status
- Processing errors: Returns 500 but acknowledges receipt
- Duplicate payments: Handled gracefully, no double-crediting
- Failed credit addition: Logged for manual review

## Security Considerations

### Payment Security
- Stripe handles all sensitive payment data (PCI compliant)
- Webhook signature verification prevents tampering
- Payment intent metadata validation
- Duplicate payment prevention

### Credit Security
- Database transactions ensure consistency
- Row-level locking prevents race conditions
- Audit trail for all credit movements
- Admin actions are logged with creator ID

## Testing

### Unit Tests
- `billingService.test.ts`: Credit management logic
- `stripeService.test.ts`: Stripe integration functionality

### Test Coverage
- Credit calculation accuracy
- Transaction consistency
- Payment flow validation
- Webhook processing
- Error handling scenarios

## Monitoring and Logging

### Key Metrics to Monitor
- Credit purchase success rate
- Webhook processing failures
- Credit balance distribution
- Payment processing errors
- User credit consumption patterns

### Log Events
- New user bonus credits granted
- Credit purchases completed
- Insufficient credit attempts
- Webhook processing results
- Admin credit adjustments

## Future Enhancements

### Planned Features
- Credit packages with discounts
- Subscription-based billing
- Credit expiration policies
- Promotional credit campaigns
- Usage analytics and reporting

### Scalability Considerations
- Database partitioning for large transaction volumes
- Webhook retry queues for high availability
- Credit balance caching for performance
- Batch processing for bulk operations

## Troubleshooting

### Common Issues
1. **Webhook not receiving events**: Check Stripe dashboard webhook configuration
2. **Payment confirmed but credits not added**: Check webhook processing logs
3. **Credit deduction failures**: Verify database transaction handling
4. **Stripe initialization errors**: Verify environment variables

### Debug Commands
```bash
# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check credit transaction history
SELECT * FROM credit_transactions WHERE user_id = 'user-id' ORDER BY created_at DESC;

# Verify user credit balance
SELECT credits FROM users WHERE id = 'user-id';
```

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor webhook processing success rates
- Review failed payment transactions
- Audit credit balance discrepancies
- Update Stripe API version as needed
- Review and optimize database queries

### Emergency Procedures
- Manual credit adjustments via admin panel
- Stripe payment refund processing
- Database transaction rollback procedures
- Webhook replay for failed events