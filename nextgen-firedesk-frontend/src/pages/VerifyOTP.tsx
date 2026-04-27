import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [phoneMask, setPhoneMask] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get email and phoneMask from location state
    const emailFromState = location.state?.email;
    const phoneMaskFromState = location.state?.phoneMask;

    if (!emailFromState) {
      toast({
        title: 'Error',
        description: 'Email not found. Please restart the password reset process.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    setEmail(emailFromState);
    if (phoneMaskFromState) {
      setPhoneMask(phoneMaskFromState);
    }
  }, [location, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email,
        otp,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'OTP verified successfully',
        });

        // Navigate to reset password page with email and otp
        navigate('/reset-password', {
          state: { email, otp },
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to verify OTP';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);

    try {
      const API_URL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });

      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message || 'A new OTP has been sent',
        });
        setOtp(''); // Clear the OTP input
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Verify OTP</h2>
            <p className="text-gray-600 mt-2">
              Enter the 6-digit code sent to
            </p>
            {phoneMask ? (
              <>
                <p className="text-orange-600 font-medium">{phoneMask}</p>
                <p className="text-xs text-gray-400 mt-1">Associated with {email}</p>
              </>
            ) : (
              <p className="text-orange-600 font-medium">{email}</p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                One-Time Password
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={handleOtpChange}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-2xl tracking-widest font-semibold"
                required
                disabled={loading || resending}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                OTP expires in 5 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || resending || otp.length !== 6}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resending || loading}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Resending...' : "Didn't receive the code? Resend OTP"}
              </button>
            </div>

            {/* Back to login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 hover:text-gray-700"
                disabled={loading || resending}
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>For your security, never share this OTP with anyone</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
