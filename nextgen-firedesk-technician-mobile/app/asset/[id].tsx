import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { assetService, AssignedAsset } from '../../services/asset';
import { dashboardService, Service } from '../../services/dashboard';
import { ArrowLeft, MapPin, Package, Shield, Clock, QrCode, Tag, AlertCircle, Navigation, Info, ClipboardList } from 'lucide-react-native';

type AssetDetail = AssignedAsset & {
    lastInspectionDate?: string;
    nextInspectionDue?: string;
    lat?: string;
    long?: string;
    category?: {
        id?: string;
        categoryName?: string;
        name?: string;
        formId?: string;
    };
    product?: {
        id?: string;
        productName?: string;
        manufacturer?: string;
        model?: string;
        serialNumber?: string;
    };
};

export default function AssetDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [asset, setAsset] = useState<AssetDetail | null>(null);
    const [serviceFormId, setServiceFormId] = useState<string | undefined>();
    const [serviceHistory, setServiceHistory] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const assetId = Array.isArray(id) ? id[0] : id;

    const fetchAsset = useCallback(async () => {
        if (!assetId) return;
        setError(null);
        setLoading(true);
        try {
            const response = await assetService.getAssetDetails(assetId);
            const payload = response?.data || response;
            const assetData = payload?.asset || payload;

            // Fetch enriched asset list to merge missing fields (geo, specs, conditions, service dates)
            let enrichedAssetFromList: any = null;
            try {
                const listRes = await assetService.getMyCategoryAssets();
                const list = listRes?.data || listRes?.assets || listRes?.myAssets || [];
                enrichedAssetFromList = list.find((a: any) => a.assetId === assetData?.assetId);
            } catch (listErr) {
                console.error('Error fetching my-category-assets for enrichment:', listErr);
            }

            const services: Service[] = [];
            // Service history fetching removed as per user request due to API error

            // Derive fallbacks from service history (now empty)
            const firstServiceAsset = services.find(s => s.asset?.assetId === assetData?.assetId)?.asset;
            const completedOrSubmitted = services
                .filter(s => ['COMPLETED', 'SUBMITTED'].includes(s.status || ''))
                .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
            const pendingOrUpcoming = services
                .filter(s => ['PENDING', 'IN_PROGRESS'].includes(s.status || ''))
                .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

            const lastService = completedOrSubmitted[0];
            const nextService = pendingOrUpcoming[0];

            const mergedAsset: AssetDetail = {
                ...(assetData || {}),
                ...(enrichedAssetFromList || {}),
                building: (assetData?.building?.building_name || assetData?.building?.buildingName || assetData?.building) || (firstServiceAsset?.building?.building_name || firstServiceAsset?.building?.buildingName || firstServiceAsset?.building),
                location: assetData?.location || firstServiceAsset?.location,
                plant: assetData?.plant || firstServiceAsset?.plant,
                lat: assetData?.lat || enrichedAssetFromList?.lat || (firstServiceAsset as any)?.lat,
                long: assetData?.long || enrichedAssetFromList?.long || (firstServiceAsset as any)?.long,
                lastInspectionDate: assetData?.lastInspectionDate || enrichedAssetFromList?.lastInspectionDate || lastService?.scheduledDate,
                nextInspectionDue: assetData?.nextInspectionDue || enrichedAssetFromList?.nextInspectionDue || nextService?.scheduledDate,
                activeConditions: (assetData as any)?.activeConditions || enrichedAssetFromList?.activeConditions,
                serviceDates: assetData?.serviceDates || enrichedAssetFromList?.serviceDates || {
                    nextServiceDates: {
                        inspection: nextService?.scheduledDate || enrichedAssetFromList?.serviceDates?.nextServiceDates?.inspection,
                        testing: enrichedAssetFromList?.serviceDates?.nextServiceDates?.testing,
                        maintenance: enrichedAssetFromList?.serviceDates?.nextServiceDates?.maintenance,
                    },
                    lastServiceDates: {
                        inspection: lastService?.scheduledDate || enrichedAssetFromList?.serviceDates?.lastServiceDates?.inspection,
                        testing: enrichedAssetFromList?.serviceDates?.lastServiceDates?.testing,
                        maintenance: enrichedAssetFromList?.serviceDates?.lastServiceDates?.maintenance,
                    }
                }
            };

            setAsset(mergedAsset);
            setServiceFormId(payload?.serviceFormId);
            setServiceHistory(services);
        } catch (err: any) {
            console.error('Error fetching asset detail:', err?.response?.status, err?.response?.data || err?.message);
            setError(err?.response?.data?.message || 'Unable to load asset details.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [assetId]);

    useEffect(() => {
        fetchAsset();
    }, [fetchAsset]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAsset();
    };

    const formatDate = (value?: string | null) => {
        if (!value) return 'Not available';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not available';
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderRow = (label: string, value?: string | null) => (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: '#6b7280', fontSize: 13, flex: 1 }}>{label}</Text>
            <Text style={{ color: '#111827', fontWeight: '600', fontSize: 14, flex: 1, textAlign: 'right' }}>
                {value || '—'}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading asset details...</Text>
            </SafeAreaView>
        );
    }

    if (error || !asset) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <AlertCircle size={40} color="#f97316" />
                </View>
                <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
                    Unable to load asset
                </Text>
                <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                    {error || 'Something went wrong. Pull to refresh to try again.'}
                </Text>
                <TouchableOpacity
                    onPress={fetchAsset}
                    style={{ backgroundColor: '#f97316', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const plantName = asset.plant?.plantName || asset.plantId?.plantName || 'Unknown Plant';
    const categoryName = asset.category?.categoryName || asset.category?.name || 'Unspecified';
    const productName = asset.product?.productName || 'Unspecified';
    const statusBadge = asset.healthStatus || asset.status || 'Unknown';
    const latitude = asset.lat || (asset as any)?.latitude;
    const longitude = asset.long || (asset as any)?.longitude;
    const hasGeo = Boolean(latitude && longitude);
    const activeConditions = (asset as any)?.activeConditions as string[] | undefined;
    const serviceDates = asset.serviceDates;
    const nextServiceDates = serviceDates?.nextServiceDates;
    const lastServiceDates = serviceDates?.lastServiceDates;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6'
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginRight: 16, padding: 4 }}
                >
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={{ color: '#1f2937', fontSize: 20, fontWeight: 'bold', flex: 1 }}>Asset Details</Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />
                }
            >
                {/* Hero Card - Basic Info */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Asset ID</Text>
                            <Text style={{ color: '#111827', fontSize: 18, fontWeight: '700', marginTop: 4 }}>{asset.assetId || '—'}</Text>
                        </View>
                        {/* <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</Text>
                            <View style={{
                                backgroundColor: statusBadge?.toUpperCase() === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 6,
                                marginTop: 4
                            }}>
                                <Text style={{
                                    color: statusBadge?.toUpperCase() === 'ACTIVE' ? '#16a34a' : '#dc2626',
                                    fontWeight: '700',
                                    fontSize: 12
                                }}>
                                    {statusBadge}
                                </Text>
                            </View>
                        </View> */}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Plant</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{plantName}</Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Building</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.building || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Floor</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
                                {typeof asset.floor === 'object' ? asset.floor?.floorName : asset.floor || '-'}
                            </Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Wing</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
                                {typeof asset.wing === 'object' ? asset.wing?.wingName : asset.wing || '-'}
                            </Text>
                        </View>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Category</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{categoryName}</Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Product</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{productName}</Text>
                        </View>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Location</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.location || '-'}</Text>
                        </View>

                    </View>

                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Health Status</Text>
                            <View style={{
                                backgroundColor: asset.healthStatus?.toUpperCase() === 'HEALTHY' ? '#dcfce7' : '#fefce8',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginTop: 4,
                                alignSelf: 'flex-start'
                            }}>
                                <Text style={{
                                    color: asset.healthStatus?.toUpperCase() === 'HEALTHY' ? '#16a34a' : '#ca8a04',
                                    fontWeight: '700',
                                    fontSize: 12
                                }}>
                                    {asset.healthStatus?.replace('_', ' ') || 'Unknown'}
                                </Text>
                            </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 24 }}>
                            <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Condition</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {activeConditions && activeConditions.length > 0 ? (
                                    activeConditions.map((cond, idx) => (
                                        <Text key={idx} style={{ color: '#dc2626', fontSize: 12, fontWeight: '500' }}>
                                            • {cond.replace(/_/g, ' ')}
                                        </Text>
                                    ))
                                ) : (
                                    <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '500' }}>• No Issues</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Specs & Capacity */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                        <Text style={{ color: '#111827', fontSize: 16, fontWeight: '700' }}>Specs & Capacity</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Type</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.type || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Sub Type</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.subType || '-'}</Text>
                        </View>
                        {(asset.capacity || asset.capacityUnit) && (
                            <View style={{ width: '50%', paddingRight: 8 }}>
                                <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Capacity</Text>
                                <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
                                    {asset.capacity} {asset.capacityUnit || ""}
                                </Text>
                            </View>
                        )}
                        {asset.specValues?.map((spec, idx) => (
                            <View key={idx} style={{ width: '50%', paddingRight: (idx % 2 === 0) ? 8 : 0, paddingLeft: (idx % 2 !== 0) ? 8 : 0 }}>
                                <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }} numberOfLines={1}>
                                    {spec.specDefinition?.label || 'Spec'}
                                </Text>
                                <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>
                                    {spec.value ? `${spec.value} ${spec.unit || ''}` : '-'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Manufacturer & Details */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                        <Text style={{ color: '#111827', fontSize: 16, fontWeight: '700' }}>Manufacturer & Details</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Manufacturer</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.manufacturer?.name || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Model</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.model || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', paddingRight: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Serial / Part No</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.slNo || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', paddingLeft: 8 }}>
                            <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Tag</Text>
                            <Text style={{ color: '#111827', fontSize: 13, fontWeight: '500', marginTop: 2 }}>{asset.tag || '-'}</Text>
                        </View>
                    </View>


                </View>


                {/* QR / attachments
                {(asset.qrCodeUrl || asset.tag) && (
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <QrCode size={18} color="#f97316" />
                            <Text style={{ color: '#111827', fontSize: 16, fontWeight: '700', marginLeft: 8 }}>Identifiers</Text>
                        </View>
                        {asset.tag && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <Tag size={16} color="#9ca3af" />
                                <Text style={{ color: '#1f2937', fontWeight: '600', marginLeft: 8 }}>{asset.tag}</Text>
                            </View>
                        )}
                        {asset.qrCodeUrl && (
                            <View style={{ marginTop: 8, alignItems: 'center' }}>
                                <Image
                                    source={{ uri: asset.qrCodeUrl }}
                                    style={{ width: 160, height: 160, resizeMode: 'contain' }}
                                />
                            </View>
                        )}
                    </View>
                )} */}
            </ScrollView>
        </SafeAreaView >
    );
}

