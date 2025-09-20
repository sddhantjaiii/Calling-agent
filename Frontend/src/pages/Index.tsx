import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SignUpForm from "@/components/auth/SignUpForm";

const Index = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-teal-500 to-teal-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-teal-800/20"></div>

        <div className="relative z-10 p-12 flex flex-col justify-center h-full max-w-lg">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-teal-600 font-bold text-lg">⚡</span>
              </div>
              <h1 className="text-2xl font-bold text-white">SniperThink</h1>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Analyze. Accelerate.
              <br />
              Automate.
            </h2>

            <p className="text-white/90 text-lg mb-8">
              Welcome to SniperThink, your all-in-one solution for AI-powered
              customer engagement
            </p>

            <button className="text-white flex items-center hover:text-white/80 transition-colors">
              Learn More →
            </button>
          </div>

          {/* Infographics */}
          <div className="flex-1 relative">
            <div className="absolute bottom-0 right-0 w-96 h-80 opacity-30">
              {/* Chat Analytics Icon */}
              <div className="bg-white/10 rounded-lg p-4 mb-4 backdrop-blur-sm">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-white/30 rounded mr-2"></div>
                  <span className="text-white text-sm">Chat Analytics</span>
                </div>
                <div className="h-16 bg-white/20 rounded mb-2"></div>
                <div className="flex space-x-1">
                  <div className="h-2 w-4 bg-white/20 rounded"></div>
                  <div className="h-2 w-6 bg-white/20 rounded"></div>
                  <div className="h-2 w-4 bg-white/20 rounded"></div>
                </div>
              </div>

              {/* Call Management Icon */}
              <div className="bg-white/10 rounded-lg p-4 mb-4 backdrop-blur-sm">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-white/30 rounded-full mr-2"></div>
                  <span className="text-white text-sm">Call Management</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-3 bg-white/20 rounded"></div>
                  <div className="h-3 bg-white/20 rounded"></div>
                  <div className="h-3 bg-white/20 rounded"></div>
                </div>
              </div>

              {/* Integration Icon */}
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-white/30 rounded-lg mr-2"></div>
                  <span className="text-white text-sm">Integrations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-white/20 rounded"></div>
                  <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                  <div className="w-4 h-4 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isLogin ? "Sign in" : "Sign up"}
              </h2>
              <p className="text-gray-600">
                {isLogin
                  ? "Welcome back to your dashboard"
                  : "Create your account"}
              </p>
            </div>

            {isLogin ? <LoginForm /> : <SignUpForm />}

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {isLogin ? "New to SniperThink? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-teal-600 hover:text-teal-500 font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
