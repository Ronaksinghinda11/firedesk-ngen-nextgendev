import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export default function TechnicianLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { loginTechnician } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    window.open('https://firedesk.in/', '_blank');
  };

  const handleSendOTP = async () => {
    // Validate phone number (10-11 digits)
    if ((phoneNumber.length < 10 || phoneNumber.length > 11) || !/^\d{10,11}$/.test(phoneNumber)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-11 digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setSendingOtp(true);

    try {
      // Use shared api client instead of raw axios to ensure correct baseURL (/api) and port
      const response = await api.post<{ message: string }>('/technician/registerCheck', {
        contactNo: phoneNumber,
      });

      if (response.message) {
        toast({
          title: 'Success',
          description: response.message || 'OTP sent to your phone',
          duration: 5000,
        });
        setOtpSent(true);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpSent) {
      handleSendOTP();
      return;
    }

    // Validate OTP
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await loginTechnician(phoneNumber, otp);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    handleSendOTP();
  };

  const handleChangePhone = () => {
    setOtpSent(false);
    setOtp('');
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
              Technician Portal
            </h2>
            <p className="text-white/90 text-base leading-relaxed max-w-sm font-light mb-6">
              Access your assigned plants, assets, and service forms. Manage inspections efficiently.
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
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Technician Login</h2>
              <p className="text-gray-600 text-sm">
                {otpSent
                  ? 'Enter the OTP sent to your phone'
                  : 'Enter your phone number to receive OTP'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-6">
                <div className="group">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-11 digit phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    required
                    disabled={otpSent}
                    className="h-14 bg-slate-50 border-transparent focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl px-5 text-base transition-all placeholder:text-gray-400 font-medium"
                    maxLength={11}
                  />
                  {otpSent && (
                    <div className="text-right mt-1">
                      <button
                        type="button"
                        onClick={handleChangePhone}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Change Number
                      </button>
                    </div>
                  )}
                </div>

                {otpSent && (
                  <div className="group">
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="h-14 bg-slate-50 border-transparent focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl px-5 text-center text-2xl tracking-widest font-bold text-gray-800 transition-all placeholder:text-gray-400"
                      maxLength={6}
                      autoFocus
                    />
                    <div className="flex justify-between items-center mt-2 px-1">
                      {/* <span className="text-xs text-gray-500">Expires in 5:00</span> */}
                      <button
                        type="button"
                        onClick={handleResendOTP}
                        disabled={sendingOtp}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50"
                      >
                        {sendingOtp ? 'Sending...' : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-600/20 hover:shadow-xl hover:shadow-orange-600/30 transition-all duration-200"
                  disabled={loading || sendingOtp}
                >
                  {loading
                    ? 'Logging in...'
                    : sendingOtp
                      ? 'Sending OTP...'
                      : otpSent
                        ? 'Verify & Login'
                        : 'Send OTP'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-gray-500 hover:text-orange-600 font-semibold transition-colors text-base"
                    onClick={() => navigate('/login')}
                  >
                    Back to Admin Login
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
