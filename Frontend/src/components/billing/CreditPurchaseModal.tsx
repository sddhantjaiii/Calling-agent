import React, { useState, useEffect } from 'react';
import { CreditCard, X, AlertCircle, CheckCircle, Loader2, DollarSign } from 'lucide-react';
import { ValidatedInput } from '../ui/ValidatedInput';
import { useBilling } from '../../hooks/useBilling';
import { toast } from 'sonner';
import { useSuccessFeedback } from '../../contexts/SuccessFeedbackContext';
import { validateField, validationSchemas } from '../../utils/formValidation';
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from '../../utils/serverValidationHandler';
import type { PricingConfig } from '../../types';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (creditsAdded: number) => void;
}

interface PurchaseStep {
  step: 'select' | 'payment' | 'processing' | 'success' | 'error';
  data?: any;
}

const PRESET_AMOUNTS = [
  { credits: 100, popular: false },
  { credits: 250, popular: false },
  { credits: 500, popular: true },
  { credits: 1000, popular: false },
  { credits: 2500, popular: false },
];

export const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { purchaseCredits, pricing, loadPricing, purchasing, error, clearError } = useBilling();
  const { showSuccess } = useSuccessFeedback();

  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>({ step: 'select' });
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState<boolean>(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<boolean>(false);

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.billing,
    {
      showToast: true,
      toastTitle: 'Purchase Failed',
    }
  );

  // Load pricing when modal opens
  useEffect(() => {
    if (isOpen && !pricing) {
      loadPricing();
    }
  }, [isOpen, pricing, loadPricing]);

  // Clear error when modal opens
  useEffect(() => {
    if (isOpen) {
      clearError();
      setPurchaseStep({ step: 'select' });
      setPaymentIntentId('');
      setClientSecret('');
      setClientErrors({});
      setServerErrors({});
      setTouched(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (purchasing) {
      return; // Don't allow closing during purchase
    }
    onClose();
  };

  const getEffectiveAmount = (): number => {
    if (useCustomAmount) {
      const amount = parseInt(customAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return selectedAmount;
  };

  const calculatePrice = (credits: number): number => {
    if (!pricing) return 0;
    return credits * pricing.pricePerCredit;
  };

  const isValidAmount = (amount: number): boolean => {
    if (!pricing) return false;
    return amount >= pricing.minimumPurchase && amount <= 10000;
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);

    // Clear both client and server errors when user starts typing
    if (clientErrors.customAmount) {
      setClientErrors(prev => ({ ...prev, customAmount: '' }));
    }
    if (serverErrors.customAmount) {
      setServerErrors(prev => ({ ...prev, customAmount: '' }));
    }
  };

  const handleCustomAmountBlur = () => {
    setTouched(true);

    if (useCustomAmount && customAmount) {
      const schema = validationSchemas.creditPurchase;
      const result = validateField(customAmount, schema.customAmount, 'customAmount');
      if (!result.isValid && result.error) {
        setClientErrors(prev => ({ ...prev, customAmount: result.error! }));
      } else {
        setClientErrors(prev => ({ ...prev, customAmount: '' }));
      }
      
      // Clear server error for this field when user is actively fixing it
      if (serverErrors.customAmount) {
        setServerErrors(prev => ({ ...prev, customAmount: '' }));
      }
    }
  };

  const validateCustomAmount = (): boolean => {
    if (!useCustomAmount) return true;

    const schema = validationSchemas.creditPurchase;
    const result = validateField(customAmount, schema.customAmount, 'customAmount');
    
    if (!result.isValid && result.error) {
      setClientErrors(prev => ({ ...prev, customAmount: result.error! }));
    } else {
      setClientErrors(prev => ({ ...prev, customAmount: '' }));
    }
    
    // Clear server errors when doing client validation
    setServerErrors({});
    setTouched(true);
    return result.isValid;
  };

  const handlePurchase = async () => {
    // Validate custom amount if being used
    if (!validateCustomAmount()) {
      return;
    }

    const amount = getEffectiveAmount();

    if (!isValidAmount(amount)) {
      toast.error(`Please enter an amount between ${pricing?.minimumPurchase || 50} and 10,000 credits.`);
      return;
    }

    try {
      setPurchaseStep({ step: 'processing' });

      const response = await purchaseCredits(amount);

      if (response) {
        setPaymentIntentId(response.paymentIntentId);
        setClientSecret(response.clientSecret);
        setPurchaseStep({
          step: 'payment',
          data: {
            amount,
            pricing: response.pricing,
            paymentIntentId: response.paymentIntentId
          }
        });
      } else {
        setPurchaseStep({ step: 'error' });
      }
    } catch (err) {
      console.error('Purchase error:', err);
      
      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(err);
      
      if (!wasValidationError) {
        // Handle other specific error types
        const errorObj = err as any;
        
        if (errorObj?.code === 'INSUFFICIENT_FUNDS') {
          toast.error('Payment Failed', {
            description: 'Your payment method was declined. Please try a different payment method.',
          });
        } else if (errorObj?.code === 'CREDIT_LIMIT_EXCEEDED') {
          setServerErrors({ customAmount: 'This amount exceeds your purchase limit' });
          toast.error('Purchase Limit Exceeded', {
            description: 'The requested amount exceeds your maximum purchase limit.',
          });
        } else if (errorObj?.code === 'UNAUTHORIZED') {
          toast.error('Session Expired', {
            description: 'Please log in again to continue.',
          });
        } else if (errorObj?.code === 'NETWORK_ERROR') {
          toast.error('Network Error', {
            description: 'Please check your internet connection and try again.',
          });
        }
      }
      
      setPurchaseStep({ step: 'error' });
    }
  };

  const handlePaymentSuccess = () => {
    const amount = purchaseStep.data?.amount || getEffectiveAmount();
    setPurchaseStep({ step: 'success', data: { amount } });

    showSuccess.billing.creditsPurchased(amount, {
      description: 'Credits are now available for use in your campaigns',
      action: {
        label: 'Start Campaign',
        onClick: () => {
          onClose();
          // Could navigate to campaign creation
        },
      },
    });

    if (onSuccess) {
      onSuccess(amount);
    }

    // Auto-close after success
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium mb-1">Select Credit Amount</h3>
        <p className="text-sm text-gray-600">
          Choose from preset amounts or enter a custom amount
        </p>
      </div>

      {/* Preset amounts */}
      <div className="grid grid-cols-2 gap-3">
        {PRESET_AMOUNTS.map(({ credits, popular }) => (
          <div
            key={credits}
            className={`cursor-pointer p-4 border rounded-lg text-center transition-all hover:shadow-md ${!useCustomAmount && selectedAmount === credits
              ? 'ring-2 ring-blue-500 border-blue-500'
              : 'hover:border-blue-300'
              }`}
            onClick={() => {
              setSelectedAmount(credits);
              setUseCustomAmount(false);
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-lg font-semibold">{credits.toLocaleString()}</span>
              <span className="text-sm text-gray-500">credits</span>
              {popular && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Popular
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              ${calculatePrice(credits).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <hr className="border-gray-200" />

      {/* Custom amount */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="custom-amount"
            checked={useCustomAmount}
            onChange={(e) => setUseCustomAmount(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="custom-amount" className="font-medium">
            Custom Amount
          </label>
        </div>

        {useCustomAmount && (
          <div className="space-y-2">
            <ValidatedInput
              type="number"
              placeholder="Enter credit amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              onBlur={handleCustomAmountBlur}
              min={pricing?.minimumPurchase || 50}
              max={10000}
              error={validationErrors.customAmount}
              touched={touched}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              description={`Minimum: ${pricing?.minimumPurchase || 50} credits • Maximum: 10,000 credits`}
            />
            {customAmount && !validationErrors.customAmount && (
              <p className="text-sm font-medium">
                Total: ${calculatePrice(parseInt(customAmount) || 0).toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pricing info */}
      {pricing && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span>Price per credit:</span>
            <span className="font-medium">${pricing.pricePerCredit.toFixed(3)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span>Selected amount:</span>
            <span className="font-medium">
              {getEffectiveAmount().toLocaleString()} credits
            </span>
          </div>
          <hr className="my-2 border-gray-200" />
          <div className="flex items-center justify-between font-medium">
            <span>Total:</span>
            <span>${calculatePrice(getEffectiveAmount()).toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePurchase}
          disabled={!isValidAmount(getEffectiveAmount()) || purchasing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {purchasing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Purchase Credits
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold">Payment Intent Created</h3>
        <p className="text-gray-600">
          Your payment has been prepared. In a real implementation, this would redirect to Stripe Checkout or show Stripe Elements.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Credits:</span>
            <span className="font-medium">{purchaseStep.data?.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-medium">${purchaseStep.data?.pricing.totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment ID:</span>
            <span className="font-mono text-xs">{purchaseStep.data?.paymentIntentId.slice(0, 20)}...</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">
          This is a demo implementation. In production, you would integrate with Stripe Elements or redirect to Stripe Checkout.
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handlePaymentSuccess}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Simulate Payment Success
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
        <h3 className="text-lg font-semibold">Processing Purchase</h3>
        <p className="text-gray-600">
          Please wait while we prepare your payment...
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h3 className="text-lg font-semibold">Purchase Successful!</h3>
        <p className="text-gray-600">
          {purchaseStep.data?.amount.toLocaleString()} credits have been added to your account.
        </p>
      </div>

      <button
        onClick={handleClose}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Done
      </button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold">Purchase Failed</h3>
        <p className="text-gray-600">
          {error || 'An error occurred while processing your purchase. Please try again.'}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={() => setPurchaseStep({ step: 'select' })}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (purchaseStep.step) {
      case 'select':
        return renderSelectStep();
      case 'payment':
        return renderPaymentStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderSelectStep();
    }
  };

  const getStepTitle = () => {
    switch (purchaseStep.step) {
      case 'select':
        return 'Purchase Credits';
      case 'payment':
        return 'Complete Payment';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      default:
        return 'Purchase Credits';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <h2 className="text-xl font-semibold">{getStepTitle()}</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={purchasing}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {purchaseStep.step === 'select' && 'Add credits to your account to make calls with your AI agents.'}
              {purchaseStep.step === 'payment' && 'Complete your payment to add credits to your account.'}
              {purchaseStep.step === 'processing' && 'We are processing your purchase request.'}
              {purchaseStep.step === 'success' && 'Your credits have been successfully added.'}
              {purchaseStep.step === 'error' && 'There was an issue processing your purchase.'}
            </p>
          </div>

          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

export default CreditPurchaseModal;