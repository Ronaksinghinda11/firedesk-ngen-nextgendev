import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../services/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';

export default function OtpScreen() {
    const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // For demo/testing, using a dummy device token
            const response = await authService.login(phoneNumber, otpString, 'dummy-device-token');

            const { accessToken, refreshToken, technician } = response.data;
            await authService.setTokens(accessToken, refreshToken);
            await authService.setUser(technician);

            router.replace('/(tabs)/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ backgroundColor: '#f3f4f6', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                >
                    <ArrowLeft size={22} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}
            >
                {/* Icon */}
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <View style={{ backgroundColor: '#fff7ed', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }}>
                        <Shield size={40} color="#f97316" />
                    </View>
                </View>

                {/* Title */}
                <View style={{ marginBottom: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#1f2937', fontSize: 28, fontWeight: 'bold' }}>Verification</Text>
                    <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 8, textAlign: 'center' }}>
                        We sent a code to +91 {phoneNumber}
                    </Text>
                </View>

                {/* OTP Input */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32, gap: 8 }}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => inputRefs.current[index] = ref}
                            style={{
                                width: 45,
                                height: 50,
                                backgroundColor: '#f9fafb',
                                borderWidth: 2,
                                borderColor: digit ? '#f97316' : '#e5e7eb',
                                borderRadius: 12,
                                color: '#1f2937',
                                fontSize: 20,
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                        />
                    ))}
                </View>

                {error ? (
                    <View style={{ backgroundColor: '#fef2f2', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 24 }}>
                        <Text style={{ color: '#dc2626', fontSize: 14, textAlign: 'center' }}>{error}</Text>
                    </View>
                ) : null}

                {/* Verify Button */}
                <TouchableOpacity
                    onPress={handleVerify}
                    disabled={loading}
                    style={{
                        backgroundColor: '#f97316',
                        borderRadius: 16,
                        paddingVertical: 18,
                        alignItems: 'center',
                        opacity: loading ? 0.7 : 1,
                        shadowColor: '#f97316',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 17 }}>Verify OTP</Text>
                    )}
                </TouchableOpacity>

                {/* Resend */}
                <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#6b7280', fontSize: 15 }}>
                        Didn't receive code?{' '}
                        <Text style={{ color: '#f97316', fontWeight: 'bold' }}>Resend</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
