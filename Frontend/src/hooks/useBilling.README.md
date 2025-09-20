# useBilling Hook

The `useBilling` hook provides comprehensive credit management functionality for the AI Calling Agent SaaS application. It handles credit balance tracking, billing history, credit purchases, and payment processing.

## Features

- **Credit Balance Management**: Fetch and display current credit balance
- **Credit Statistics**: Detailed statistics including total purchased, used, and average usage
- **Billing History**: Paginated transaction history with filtering
- **Credit Purchases**: Stripe integration for purchasing credits
- **Payment Confirmation**: Handle payment confirmation and credit addition
- **Credit Checking**: Verify if user has sufficient credits for operations
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Granular loading states for different operations
- **Auto-refresh**: Automatic data refresh after operations

## Usage

```typescript
import { useBilling } from '../hooks/useBilling';

function BillingComponent() {
  const {
    // State
    credits,
    stats,
    history,
    pricing,
    loading,
    error,
    
    // Actions
    refreshCredits,
    purchaseCredits,
    refreshAll,
  } = useBilling();

  // Use the hook data and actions
  return (
    <div>
      {credits && <div>Credits: {credits.credits}</div>}
      <button onClick={refreshCredits}>Refresh Credits</button>
    </div>
  );
}
```

## API Reference

### State Properties

#### `credits: CreditBalance | null`
Current credit balance information.
```typescript
interface CreditBalance {
  credits: number;
  userId?: string;
}
```

#### `stats: CreditStats | null`
Detailed credit statistics.
```typescript
interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  totalBonus: number;
  totalAdjustments: number;
  transactionCount: number;
  averageUsagePerDay: number;
  projectedRunoutDate?: string;
}
```

#### `history: BillingHistory | null`
Paginated billing transaction history.
```typescript
interface BillingHistory {
  transactions: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `pricing: PricingConfig | null`
Pricing configuration for credit purchases.
```typescript
interface PricingConfig {
  pricePerCredit: number;
  minimumPurchase: number;
  currency: string;
  examples: Array<{
    credits: number;
    price: number;
  }>;
}
```

#### Loading States
- `loading: boolean` - Overall loading state
- `loadingCredits: boolean` - Loading state for credit balance
- `loadingStats: boolean` - Loading state for statistics
- `loadingHistory: boolean` - Loading state for billing history
- `loadingPricing: boolean` - Loading state for pricing
- `purchasing: boolean` - Loading state for purchase operations

#### `error: string | null`
Current error message, if any.

#### `lastRefresh: Date | null`
Timestamp of last successful data refresh.

### Action Methods

#### `refreshCredits(): Promise<void>`
Fetches the current credit balance from `/api/billing/credits`.

```typescript
const handleRefreshCredits = async () => {
  await refreshCredits();
  // credits state will be updated automatically
};
```

#### `refreshStats(): Promise<void>`
Fetches detailed credit statistics from `/api/billing/stats`.

#### `refreshHistory(page?: number, limit?: number): Promise<void>`
Fetches billing history with optional pagination.

```typescript
// Fetch first page with default limit (20)
await refreshHistory();

// Fetch specific page with custom limit
await refreshHistory(2, 10);
```

#### `purchaseCredits(amount: number): Promise<PurchaseCreditsResponse | null>`
Initiates credit purchase via Stripe.

```typescript
const handlePurchase = async () => {
  const result = await purchaseCredits(100);
  if (result) {
    // Redirect to Stripe checkout with result.clientSecret
    console.log('Payment Intent:', result.paymentIntentId);
  }
};
```

#### `confirmPayment(paymentIntentId: string): Promise<boolean>`
Confirms Stripe payment and adds credits to account.

```typescript
const handleConfirmPayment = async (paymentIntentId: string) => {
  const success = await confirmPayment(paymentIntentId);
  if (success) {
    // Credits have been added, data will be refreshed automatically
  }
};
```

#### `checkCredits(requiredCredits?: number): Promise<CreditCheckResponse | null>`
Checks if user has sufficient credits for an operation.

```typescript
const handleCheckCredits = async () => {
  const result = await checkCredits(10);
  if (result) {
    console.log('Has enough credits:', result.hasEnoughCredits);
    console.log('Current credits:', result.currentCredits);
  }
};
```

#### `refreshAll(): Promise<void>`
Refreshes all billing data (credits, stats, history, payment history).

#### `clearError(): void`
Clears the current error state.

## Error Handling

The hook provides comprehensive error handling with user-friendly error messages:

```typescript
const {
  error,
  clearError,
} = useBilling();

// Display error to user
if (error) {
  return (
    <div className="error">
      {error}
      <button onClick={clearError}>Dismiss</button>
    </div>
  );
}
```

### Error Types

- **UNAUTHORIZED**: Session expired, user needs to log in again
- **INSUFFICIENT_CREDITS**: Not enough credits for operation
- **PAYMENT_FAILED**: Payment processing failed
- **NETWORK_ERROR**: Network connectivity issues
- **VALIDATION_ERROR**: Invalid input data
- **SERVER_ERROR**: Backend server errors

## Loading States

The hook provides granular loading states for better UX:

```typescript
const {
  loading,        // Overall loading state
  loadingCredits, // Specific to credit balance
  loadingStats,   // Specific to statistics
  purchasing,     // Specific to purchase operations
} = useBilling();

// Show different loading indicators
if (loadingCredits) {
  return <div>Loading credits...</div>;
}

if (purchasing) {
  return <div>Processing payment...</div>;
}
```

## Auto-refresh Behavior

The hook automatically refreshes data after certain operations:

- After successful payment confirmation, all billing data is refreshed
- After credit purchases, the credit balance is updated
- The `lastRefresh` timestamp tracks when data was last updated

## Configuration

### Auto-load Pricing

```typescript
// Auto-load pricing on initialization (default: true)
const billing = useBilling(true);

// Skip auto-loading pricing
const billing = useBilling(false);
```

## Backend API Integration

The hook integrates with the following backend endpoints:

- `GET /api/billing/credits` - Get credit balance
- `GET /api/billing/stats` - Get credit statistics  
- `GET /api/billing/history` - Get billing history
- `POST /api/billing/purchase` - Purchase credits
- `POST /api/billing/confirm-payment` - Confirm payment
- `GET /api/billing/pricing` - Get pricing config
- `GET /api/billing/payment-history` - Get payment history
- `GET /api/billing/check` - Check credit sufficiency

## Requirements Compliance

This hook fulfills the following requirements:

- **6.1**: ✅ Fetch credit balance from `/api/billing/credits`
- **6.2**: ✅ Fetch credit statistics from `/api/billing/stats`
- **6.3**: ✅ Fetch billing history from `/api/billing/history`
- **6.4**: ✅ Handle credit purchases via `/api/billing/purchase`
- **6.5**: ✅ Update credit balance after operations

## Example Implementation

See `Frontend/src/components/billing/BillingExample.tsx` for a complete example of how to use the useBilling hook in a React component.

## Testing

Unit tests are available in `Frontend/src/hooks/__tests__/useBilling.test.ts` covering:

- Initial state
- Credit fetching
- Statistics fetching
- Billing history
- Credit purchases
- Error handling
- State management