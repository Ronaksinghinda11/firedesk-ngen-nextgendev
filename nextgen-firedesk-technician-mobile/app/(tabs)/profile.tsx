import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../services/auth';
import { dashboardService } from '../../services/dashboard';
import { useRouter } from 'expo-router';
import { User, Building2, Package, Phone, Mail, LogOut, ChevronRight, Shield, Briefcase, Settings, HelpCircle, UserCheck } from 'lucide-react-native';

interface Manager {
    id: string;
    user: {
        name: string;
        phone: string;
        email: string;
    };
}

interface TechnicianProfile {
    id: string;
    technicianId: string;
    technicianType: string;
    user: {
        id: string;
        name: string;
        email: string;
        contactNo: string;
        profilePicture?: string;
    };
}

interface Plant {
    id: string;
    plantId: string;
    plantName: string;
    addressLine1?: string;
    managers?: Manager[];
}

interface Category {
    id: string;
    categoryName: string;
}

export default function ProfileScreen() {
    const [user, setUser] = useState<any>(null);
    const [plants, setPlants] = useState<Plant[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [technicianType, setTechnicianType] = useState<string>('');
    const [technicianId, setTechnicianId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);

            const response = await dashboardService.getMyPlants();
            if (response?.technician) {
                const plantsData = response.technician.plants || [];
                setPlants(plantsData);
                setCategories(response.technician.categories || []);
                setTechnicianType(response.technician.technicianType || '');
                setTechnicianId(response.technician.technicianId || '');

                // Extract unique managers from all plants
                const allManagers: Manager[] = [];
                plantsData.forEach((plant: Plant) => {
                    if (plant.managers) {
                        plant.managers.forEach((manager: Manager) => {
                            if (!allManagers.find(m => m.id === manager.id)) {
                                allManagers.push(manager);
                            }
                        });
                    }
                });
                setManagers(allManagers);
            }
        } catch (error) {
            // Silently handle profile loading errors
            // console.error('Error loading profile data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleLogout = async () => {
        await authService.clearTokens();
        router.replace('/login');
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#f97316" size="large" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {/* Profile Header Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    marginHorizontal: 16,
                    marginTop: 16,
                    borderRadius: 20,
                    padding: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ alignItems: 'center' }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#f97316',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 12
                        }}>
                            {user?.profilePicture ? (
                                <Image
                                    source={{ uri: user.profilePicture }}
                                    style={{ width: 80, height: 80, borderRadius: 40 }}
                                />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                                    {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                                </Text>
                            )}
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 22, fontWeight: 'bold' }}>
                            {user?.name || 'Technician'}
                        </Text>
                        <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 }}>
                            <Text style={{ color: '#ea580c', fontSize: 13, fontWeight: '600' }}>
                                {technicianType || 'Technician'}
                            </Text>
                        </View>
                        {technicianId && (
                            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
                                ID: {technicianId}
                            </Text>
                        )}
                    </View>

                    {/* Contact Info */}
                    <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ backgroundColor: '#fff7ed', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                                <Phone size={18} color="#f97316" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Phone Number</Text>
                                <Text style={{ color: '#1f2937', fontSize: 15, fontWeight: '500' }}>
                                    {user?.phone || user?.contactNo || 'Not available'}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: '#fff7ed', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                                <Mail size={18} color="#f97316" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Email Address</Text>
                                <Text style={{ color: '#1f2937', fontSize: 15, fontWeight: '500' }}>
                                    {user?.email || 'Not available'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Assigned Manager */}
                <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#fef3c7', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <UserCheck size={16} color="#d97706" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>Assigned Manager</Text>
                    </View>
                    {managers.length > 0 ? (
                        managers.map((manager) => (
                            <View
                                key={manager.id}
                                style={{
                                    backgroundColor: '#ffffff',
                                    padding: 16,
                                    borderRadius: 14,
                                    marginBottom: 8,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                }}
                            >
                                <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>{manager.user?.name || 'Manager'}</Text>
                                {manager.user?.phone && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                        <Phone size={14} color="#6b7280" />
                                        <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 6 }}>{manager.user.phone}</Text>
                                    </View>
                                )}
                                {manager.user?.email && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <Mail size={14} color="#6b7280" />
                                        <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 6 }}>{manager.user.email}</Text>
                                    </View>
                                )}
                            </View>
                        ))
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 14, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280' }}>No manager assigned</Text>
                        </View>
                    )}
                </View>

                {/* Assigned Plants */}
                <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#eff6ff', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Building2 size={16} color="#2563eb" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>Assigned Plants</Text>
                    </View>
                    {plants.length > 0 ? (
                        plants.map((plant) => (
                            <View
                                key={plant.id}
                                style={{
                                    backgroundColor: '#ffffff',
                                    padding: 16,
                                    borderRadius: 14,
                                    marginBottom: 8,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                }}
                            >
                                <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>{plant.plantName}</Text>
                                {plant.addressLine1 && (
                                    <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{plant.addressLine1}</Text>
                                )}
                                {/* <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>{plant.plantId}</Text> */}
                            </View>
                        ))
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 14, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280' }}>No plants assigned</Text>
                        </View>
                    )}
                </View>

                {/* Assigned Categories */}
                <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#dcfce7', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Package size={16} color="#16a34a" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>Assigned Categories</Text>
                    </View>
                    {categories.length > 0 ? (
                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            backgroundColor: '#ffffff',
                            padding: 12,
                            borderRadius: 14,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 4,
                            elevation: 1,
                        }}>
                            {categories.map((category) => (
                                <View
                                    key={category.id}
                                    style={{
                                        backgroundColor: '#dcfce7',
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        margin: 4
                                    }}
                                >
                                    <Text style={{ color: '#16a34a', fontWeight: '600', fontSize: 13 }}>{category.categoryName}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={{ backgroundColor: '#ffffff', padding: 24, borderRadius: 14, alignItems: 'center' }}>
                            <Text style={{ color: '#6b7280' }}>No categories assigned</Text>
                        </View>
                    )}
                </View>

                {/* Actions */}
                <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 100, gap: 12 }}>


                    {/* Logout Button */}
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={{
                            backgroundColor: '#fee2e2',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            borderRadius: 14
                        }}
                    >
                        <LogOut size={20} color="#dc2626" />
                        <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}