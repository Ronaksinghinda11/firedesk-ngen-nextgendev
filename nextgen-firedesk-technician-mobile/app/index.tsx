import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            checkAuth();
        }, 100); // Small delay to ensure router is ready
        return () => clearTimeout(timer);
    }, []);

    const checkAuth = async () => {
        try {
            const isAuthenticated = await authService.isAuthenticated();
            if (isAuthenticated) {
                router.replace('/(tabs)/dashboard');
            } else {
                router.replace('/login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setError('Failed to check authentication');
            // Navigate to login after a short delay even on error
            setTimeout(() => {
                router.replace('/login');
            }, 1000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
                {error || 'Loading...'}
            </Text>
        </View>
    );
}
