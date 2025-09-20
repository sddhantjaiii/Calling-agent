import React, { useState } from 'react';
import { useTheme } from '../components/theme/ThemeProvider';
import CreditDashboard from '../components/billing/CreditDashboard';
import BillingHistoryDisplay from '../components/billing/BillingHistoryDisplay';
import { CreditPurchaseModal } from '../components/billing/CreditPurchaseModal';
import { useBilling } from '../hooks/useBilling';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface BillingProps {
  onBack?: () => void;
}

const Billing: React.FC<BillingProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { refreshAll } = useBilling();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handlePurchaseSuccess = async (creditsAdded: number) => {
    toast.success(`Successfully added ${creditsAdded} credits to your account!`);
    // Refresh billing data to show updated balance
    await refreshAll();
    setShowPurchaseModal(false);
  };



  return (
    <div className={`min-h-screen p-6 ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className={`${
                  theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <h1 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Billing & Credits
            </h1>
          </div>
        </div>

        {/* Credit Dashboard */}
        <CreditDashboard
          onPurchaseClick={() => setShowPurchaseModal(true)}
          showHistory={true}
          showUsageIndicator={true}
        />

        {/* Detailed Billing History */}
        <div className="mt-8">
          <div className={`p-6 rounded-lg border ${
            theme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Complete Transaction History
            </h2>
            <BillingHistoryDisplay 
              showTitle={false}
              maxHeight="800px"
            />
          </div>
        </div>

        {/* Purchase Modal */}
        <CreditPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      </div>
    </div>
  );
};

export default Billing;