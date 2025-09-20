import { useState } from "react";
import { Filter, CreditCard, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/ThemeProvider";
import CallLogs from "@/components/call/CallLogs";
import CallAnalytics from "@/components/call/CallAnalytics";
import CallData from "@/components/call/CallData";
import type { Lead } from "@/pages/Dashboard";

interface CallAgentProps {
  agent?: any; // The specific call agent
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onOpenProfile?: (lead: Lead) => void;
}

const CallAgent = ({
  agent,
  activeSubTab,
  setActiveSubTab,
  onOpenProfile,
}: CallAgentProps) => {
  const { theme } = useTheme();
  const [minutes, setMinutes] = useState(5);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const showBuyMinutes = minutes < 10;

  const plans = [
    { id: "basic", name: "100 Minutes", price: "₹999", minutes: 100 },
    { id: "pro", name: "500 Minutes", price: "₹3999", minutes: 500 },
    { id: "enterprise", name: "1000 Minutes", price: "₹6999", minutes: 1000 },
  ];

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "logs":
        return <CallLogs />;
      case "analytics":
        return <CallAnalytics />;
      case "data":
        // Forward the onOpenProfile handler to CallData (which forwards it to ChatData)
        return (
          <CallData
            onNavigateToLogs={undefined}
            onOpenProfile={onOpenProfile}
          />
        );
      default:
        return <CallLogs />;
    }
  };

  const handlePurchase = () => {
    setShowPaymentGateway(true);
    setPaymentStep(1);
    setPaymentSuccess(false);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentStep(2);
  };

  const handlePayment = () => {
    setPaymentStep(3);
    setTimeout(() => {
      setPaymentSuccess(true);
      const selectedPlanData = plans.find((p) => p.id === selectedPlan);
      if (selectedPlanData) {
        setMinutes((prev) => prev + selectedPlanData.minutes);
      }
      setTimeout(() => {
        setShowPaymentGateway(false);
        setPaymentStep(1);
        setSelectedPlan(null);
      }, 2000);
    }, 2000);
  };

  const closePaymentGateway = () => {
    setShowPaymentGateway(false);
    setPaymentStep(1);
    setSelectedPlan(null);
    setPaymentSuccess(false);
  };

  return (
    <div
      className={`p-6 space-y-6 ${
        theme === "dark" ? "bg-black" : "bg-gray-50"
      }`}
    >
      {/* Sub-tab content */}
      {renderSubTabContent()}

      {/* Payment Gateway Dialog */}
      <Dialog open={showPaymentGateway} onOpenChange={closePaymentGateway}>
        <DialogContent
          className={`max-w-md ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`flex items-center ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Purchase Call Minutes
            </DialogTitle>
          </DialogHeader>

          {paymentStep === 1 && (
            <div className="py-4 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Choose a Plan
              </h3>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  className="border border-slate-600 rounded-lg p-4 cursor-pointer hover:border-[#1A6262] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-medium">{plan.name}</h4>
                      <p className="text-slate-400 text-sm">
                        {plan.minutes} call minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-lg">
                        {plan.price}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {paymentStep === 2 && (
            <div className="py-4 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Payment Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 block mb-2">
                      Expiry
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 block mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="border-t border-slate-600 pt-4">
                <div className="flex items-center justify-between text-white">
                  <span>Total Amount:</span>
                  <span className="font-bold text-lg">
                    {plans.find((p) => p.id === selectedPlan)?.price}
                  </span>
                </div>
              </div>
              <Button
                onClick={handlePayment}
                style={{ backgroundColor: "#1A6262" }}
                className="w-full hover:opacity-90 text-white"
              >
                Complete Payment
              </Button>
            </div>
          )}

          {paymentStep === 3 && !paymentSuccess && (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A6262] mx-auto mb-4"></div>
              <p className="text-white">Processing payment...</p>
            </div>
          )}

          {paymentSuccess && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-[#1A6262] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Payment Successful!
              </h3>
              <p className="text-slate-300">
                {plans.find((p) => p.id === selectedPlan)?.minutes} minutes
                added to your account
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallAgent;
