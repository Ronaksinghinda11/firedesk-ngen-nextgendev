import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, ArrowRight } from 'lucide-react-native';

export default function LoginScreen() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSendOtp = async () => {
        if (phoneNumber.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.sendOtp(phoneNumber);
            router.push({ pathname: '/otp', params: { phoneNumber } });
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
            >
                {/* Logo/Brand Area */}
                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                    <View style={{ 
                        width: 80, 
                        height: 80, 
                        backgroundColor: '#fff7ed', 
                        borderRadius: 20, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        marginBottom: 16
                    }}>
                        <View style={{ 
                            width: 50, 
                            height: 50, 
                            backgroundColor: '#f97316', 
                            borderRadius: 12, 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                        }}>
                            <Phone size={28} color="#ffffff" />
                        </View>
                    </View>
                    <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '600', letterSpacing: 1 }}>TECHNICIAN APP</Text>
                </View>

                {/* Welcome Text */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ color: '#1f2937', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>Welcome Back</Text>
                    <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                        Enter your phone number to access your assigned tasks
                    </Text>
                </View>

                {/* Phone Input */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Phone Number</Text>
                    <View style={{ 
                        backgroundColor: '#f9fafb', 
                        borderRadius: 12, 
                        borderWidth: 1, 
                        borderColor: error ? '#ef4444' : '#e5e7eb', 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        paddingHorizontal: 16, 
                        paddingVertical: 4 
                    }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 8, marginRight: 12 }}>
                            <Phone size={20} color="#f97316" />
                        </View>
                        <TextInput
                            style={{ flex: 1, color: '#1f2937', fontSize: 16, paddingVertical: 12 }}
                            placeholder="Enter 10-digit number"
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            maxLength={10}
                        />
                    </View>
                    {error ? (
                        <Text style={{ color: '#ef4444', fontSize: 13, marginTop: 8, marginLeft: 4 }}>{error}</Text>
                    ) : null}
                </View>

                {/* Get OTP Button */}
                <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={{
                        backgroundColor: '#f97316',
                        borderRadius: 12,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        justifyContent: 'center',
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
                        <>
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>Get OTP</Text>
                            <ArrowRight size={20} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
