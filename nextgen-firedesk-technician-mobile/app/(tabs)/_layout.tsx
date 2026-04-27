import { Tabs } from 'expo-router';
import { Home, QrCode, Calendar, Ticket, User } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = 60 + insets.bottom;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopColor: '#f3f4f6',
                    borderTopWidth: 1,
                    height: tabBarHeight,
                    paddingBottom: insets.bottom,
                    paddingTop: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 10,
                },
                tabBarActiveTintColor: '#f97316',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: '#fff7ed', padding: 8, borderRadius: 12 } : { padding: 8 }}>
                            <Home size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="tickets"
                options={{
                    title: 'Tickets',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: '#fff7ed', padding: 8, borderRadius: 12 } : { padding: 8 }}>
                            <Ticket size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="scan"
                options={{
                    title: 'Scan',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: '#fff7ed', padding: 8, borderRadius: 12 } : { padding: 8 }}>
                            <QrCode size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'Calendar',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: '#fff7ed', padding: 8, borderRadius: 12 } : { padding: 8 }}>
                            <Calendar size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? { backgroundColor: '#fff7ed', padding: 8, borderRadius: 12 } : { padding: 8 }}>
                            <User size={22} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
