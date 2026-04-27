import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    window.open('https://firedesk.in/', '_blank');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address first',
        variant: 'destructive',
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const API_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });

      if (response.data.success) {
        // Show OTP in toast if in test mode
        const description = response.data.testMode
          ? `TEST MODE: Your OTP is ${response.data.otp}`
          : response.data.message; // Use backend message which mentions phone

        toast({
          title: 'Success',
          description: description,
          duration: response.data.testMode ? 10000 : 5000,
        });

        // Navigate to verify OTP page
        navigate('/verify-otp', {
          state: {
            email,
            phoneMask: response.data.phone_mask
          },
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
    } catch (error) {
      console.error('Login error caught in component:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 relative overflow-hidden p-4">
      {/* Animated Fire Background - Light Theme */}
      <style>
        {`
          @keyframes fire-pulse-1 {
            0% { transform: scale(1) translate(0, 0); opacity: 0.5; }
            50% { transform: scale(1.3) translate(20px, -20px); opacity: 0.7; }
            100% { transform: scale(1) translate(0, 0); opacity: 0.5; }
          }
          @keyframes fire-pulse-2 {
            0% { transform: scale(1) translate(0, 0); opacity: 0.5; }
            50% { transform: scale(1.2) translate(-20px, 20px); opacity: 0.7; }
            100% { transform: scale(1) translate(0, 0); opacity: 0.5; }
          }
          @keyframes ember-float-light {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateY(-200px) translateX(50px) scale(0.5); opacity: 0; }
          }
          .fire-blob-1 {
            background: radial-gradient(circle, #fb923c 0%, #fdba74 40%, transparent 50%);
            animation: fire-pulse-1 12s ease-in-out infinite;
          }
          .fire-blob-2 {
            background: radial-gradient(circle, #fcc9a5ff 0%, #ff823eff 40%, transparent 50%);
            animation: fire-pulse-2 15s ease-in-out infinite alternate;
          }
          .ember-light {
            position: absolute;
            width: 6px;
            height: 6px;
            background: #ea580c; /* Dark Orange for visibility */
            border-radius: 50%;
            filter: blur(1px);
          }
        `}
      </style>
      <div className="absolute inset-0 bg-orange-50 overflow-hidden">
        {/* Top Left Fire Blob */}
        <div className="absolute -top-[50%] -left-[50%] w-[70%] h-[70%] rounded-full fire-blob-1 blur-[100px]" />

        {/* Bottom Right Fire Blob */}
        <div className="absolute -bottom-[50%] -right-[50%] w-[70%] h-[70%] rounded-full fire-blob-2 blur-[100px]" />

        {/* Animated Embers */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="ember-light"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `ember-float-light ${5 + Math.random() * 5}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              transform: 'scale(0)' // Start hidden
            }}
          />
        ))}
      </div>

      <div className="bg-white w-full max-w-5xl min-h-[600px] rounded-3xl shadow-2xl flex overflow-hidden relative z-10 mx-auto border border-white/50">

        {/* Left Side - Image Panel */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url('/login-visual.png')` }}
          />
          {/* Gradients */}

          {/* Logo (Top) */}
          <div className="relative z-20">
            <img
              src="/firedesklogo.png"
              alt="FireDesk Logo"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
          </div>

          {/* Content (Bottom) */}
          <div className="relative z-20 text-white">
            <h2 className="text-4xl font-bold mb-4 tracking-tight leading-tight">
              Welcome Back
            </h2>
            <p className="text-white/90 text-base leading-relaxed max-w-sm font-light mb-6">
              Fire maintenance made smart—track, inspect, and comply anytime, anywhere.
            </p>
            <Button
              variant="outline"
              className="h-10 px-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white rounded-lg transition-all"
              onClick={handleClick}
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-white">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center lg:text-left">
              <div className="lg:hidden flex justify-center mb-6">
                <img
                  src="/firedesklogo.png"
                  alt="FireDesk Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h2>
              <p className="text-gray-600 text-sm">Enter your email and password to sign in</p>

            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-6">
                <div className="group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-lg px-4 text-sm transition-all"
                  />
                </div>

                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-lg px-4 pr-10 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading || loading}
                  className="text-xs font-medium text-gray-500 hover:text-orange-600 transition-colors"
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-md shadow-orange-600/10 hover:shadow-lg hover:shadow-orange-600/20 transition-all duration-200 text-sm"
                  disabled={loading}
                >
                  {loading ? 'Sign In' : 'Sign In'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-10 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg font-medium transition-all text-sm"
                  onClick={() => navigate('/technician/login')}
                >
                  Technician Login
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
