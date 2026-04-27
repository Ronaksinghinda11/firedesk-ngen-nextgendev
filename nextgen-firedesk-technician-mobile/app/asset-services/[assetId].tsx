import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardService, Service } from '../../services/dashboard';
import {
    ArrowLeft,
    Package,
    MapPin,
    Clock,
    Calendar,
    ChevronRight,
    ClipboardList,
    AlertTriangle,
    CheckCircle,
    Play
} from 'lucide-react-native';

export default function AssetServicesScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();

    const assetId = params.assetId as string;
    const plantId = params.plantId as string;
    const category = params.category as string;
    const assetName = params.assetName as string;
    const plantName = params.plantName as string;

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assetInfo, setAssetInfo] = useState<any>(null);

    const fetchServices = async () => {
        try {
            const response = await dashboardService.getServicesByAsset(assetId);
            if (response.success && response.data) {
                // Normalize status to uppercase for consistent display
                const normalizedServices = response.data.services.map((service: Service) => ({
                    ...service,
                    status: (service.status || 'PENDING').toUpperCase()
                }));
                setServices(normalizedServices);
                setAssetInfo(response.data.asset);
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [assetId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchServices();
    }, [assetId]);

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            'PENDING': { bg: '#fef3c7', text: '#d97706', label: 'Pending' },
            'IN_PROGRESS': { bg: '#dbeafe', text: '#2563eb', label: 'In Progress' },
            'SUBMITTED': { bg: '#f3e8ff', text: '#9333ea', label: 'Submitted' },
            'APPROVED': { bg: '#dcfce7', text: '#16a34a', label: 'Approved' },
            'COMPLETED': { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
            'REJECTED': { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' },
        };
        const normalizedStatus = status?.toUpperCase() || 'PENDING';
        const config = statusConfig[normalizedStatus] || statusConfig['PENDING'];

        return (
            <View style={{ backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: config.text, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
            </View>
        );
    };

    const handleServicePress = (service: Service) => {
        // Navigate to service form with QR verification flag
        router.push({
            pathname: '/service/[id]',
            params: {
                id: service.id,
                fromQRScan: 'true', // Indicates this came from QR scan
                scannedAssetId: assetId,
                scannedPlantId: plantId
            }
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={{ color: '#6b7280', marginTop: 16 }}>Loading services...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb'
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Today's Services</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>For scanned asset</Text>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
                }
            >
                {/* Asset Info Card */}
                <View style={{
                    marginHorizontal: 16,
                    marginTop: 16,
                    backgroundColor: '#f97316',
                    borderRadius: 20,
                    padding: 20,
                    shadowColor: '#f97316',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 14 }}>
                            <Package size={28} color="white" />
                        </View>
                        <View style={{ marginLeft: 14, flex: 1 }}>
                            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>{assetName || assetId}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 }}>
                                {category || 'Asset'}
                            </Text>
                        </View>
                    </View>

                    <View style={{
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        borderRadius: 12,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}>
                        <MapPin size={18} color="rgba(255,255,255,0.9)" />
                        <Text style={{ color: 'white', marginLeft: 10, flex: 1 }}>
                            {plantName || assetInfo?.plant?.plantName || 'Unknown Plant'}
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', marginTop: 16 }}>
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 12,
                            padding: 12,
                            marginRight: 8,
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Services Today</Text>
                            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
                                {services.length}
                            </Text>
                        </View>
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 12,
                            padding: 12,
                            marginLeft: 8,
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Pending</Text>
                            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
                                {services.filter(s => s.status?.toUpperCase() === 'PENDING').length}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Services List */}
                <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
                    <Text style={{ color: '#6b7280', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' }}>
                        Scheduled Services
                    </Text>

                    {services.length === 0 ? (
                        <View style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 32,
                            alignItems: 'center'
                        }}>
                            <View style={{ backgroundColor: '#f3f4f6', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                                <ClipboardList size={32} color="#9ca3af" />
                            </View>
                            <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                                No Services Today
                            </Text>
                            <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                                There are no services scheduled for this asset today.
                            </Text>
                        </View>
                    ) : (
                        services.map((service) => (
                            <TouchableOpacity
                                key={service.id}
                                onPress={() => handleServicePress(service)}
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: '600' }}>
                                            {service.form?.serviceName || 'Service'}
                                        </Text>
                                        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                                            {service.inspectionType} • {service.frequency?.frequencyName || 'N/A'}
                                        </Text>
                                    </View>
                                    {getStatusBadge(service.status)}
                                </View>

                                <View style={{
                                    flexDirection: 'row',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: 10,
                                    padding: 10
                                }}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                        <Calendar size={14} color="#6b7280" />
                                        <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 6 }}>
                                            {new Date(service.scheduledDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    {service.startedAt && (
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                            <Clock size={14} color="#6b7280" />
                                            <Text style={{ color: '#6b7280', fontSize: 12, marginLeft: 6 }}>
                                                Started {new Date(service.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: 12,
                                    paddingTop: 12,
                                    borderTopWidth: 1,
                                    borderTopColor: '#f3f4f6'
                                }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {service.status === 'PENDING' ? (
                                            <>
                                                <AlertTriangle size={14} color="#d97706" />
                                                <Text style={{ color: '#d97706', fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                                                    Requires QR Verification
                                                </Text>
                                            </>
                                        ) : service.status === 'IN_PROGRESS' ? (
                                            <>
                                                <Play size={14} color="#2563eb" />
                                                <Text style={{ color: '#2563eb', fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                                                    Continue Service
                                                </Text>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={14} color="#16a34a" />
                                                <Text style={{ color: '#16a34a', fontSize: 12, marginLeft: 6, fontWeight: '500' }}>
                                                    View Details
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                    <View style={{
                                        backgroundColor: '#fff7ed',
                                        padding: 8,
                                        borderRadius: 8
                                    }}>
                                        <ChevronRight size={18} color="#f97316" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action */}
            {services.length > 0 && services.some(s => s.status?.toUpperCase() === 'PENDING' || s.status?.toUpperCase() === 'IN_PROGRESS') && (
                <View style={{
                    backgroundColor: '#ffffff',
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb'
                }}>
                    <TouchableOpacity
                        onPress={() => {
                            const pendingService = services.find(s => s.status?.toUpperCase() === 'PENDING' || s.status?.toUpperCase() === 'IN_PROGRESS');
                            if (pendingService) handleServicePress(pendingService);
                        }}
                        style={{
                            backgroundColor: '#f97316',
                            borderRadius: 12,
                            paddingVertical: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ClipboardList size={20} color="white" />
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
                            Fill Service Form
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
