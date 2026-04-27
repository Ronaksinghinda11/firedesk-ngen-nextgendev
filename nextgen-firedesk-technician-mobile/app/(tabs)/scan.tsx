import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardService, QRCodeData } from '../../services/dashboard';
import { X, Camera, QrCode, Package, Scan } from 'lucide-react-native';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
    }, [permission]);

    if (!permission) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f97316" />
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{
                    backgroundColor: '#fff7ed',
                    padding: 24,
                    borderRadius: 24,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 320
                }}>
                    <View style={{ backgroundColor: '#f97316', padding: 20, borderRadius: 20, marginBottom: 20 }}>
                        <Camera size={48} color="white" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                        Camera Permission Required
                    </Text>
                    <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                        We need camera access to scan QR codes on assets and verify your location.
                    </Text>
                    <TouchableOpacity
                        onPress={requestPermission}
                        style={{
                            backgroundColor: '#f97316',
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 12,
                            width: '100%'
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>
                            Grant Permission
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const parseQRCode = (data: string): QRCodeData | null => {
        console.log('[QR Parse] Input data:', data);

        // Method 1: Try to parse as JSON directly
        try {
            const parsed = JSON.parse(data);
            if (parsed.asset_id) {
                console.log('[QR Parse] Extracted asset_id from JSON:', parsed.asset_id);
                return {
                    asset_id: parsed.asset_id,
                    plant_id: parsed.plant_id || '',
                    category: parsed.category || ''
                };
            }
        } catch (e) {
            console.log('[QR Parse] Not valid JSON, trying other methods...');
        }

        // Method 2: Try to find JSON embedded in the string (in case there's extra characters)
        const jsonMatch = data.match(/\{[^}]*"asset_id"\s*:\s*"([^"]+)"[^}]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.asset_id) {
                    console.log('[QR Parse] Extracted asset_id from embedded JSON:', parsed.asset_id);
                    return {
                        asset_id: parsed.asset_id,
                        plant_id: parsed.plant_id || '',
                        category: parsed.category || ''
                    };
                }
            } catch (e) {
                // Just extract the asset_id using regex
                const assetIdMatch = data.match(/"asset_id"\s*:\s*"([^"]+)"/);
                if (assetIdMatch && assetIdMatch[1]) {
                    console.log('[QR Parse] Extracted asset_id via regex:', assetIdMatch[1]);
                    return {
                        asset_id: assetIdMatch[1],
                        plant_id: '',
                        category: ''
                    };
                }
            }
        }

        // Method 3: Direct regex extraction for asset_id
        const assetIdRegex = /"asset_id"\s*:\s*"([^"]+)"/;
        const match = data.match(assetIdRegex);
        if (match && match[1]) {
            console.log('[QR Parse] Extracted asset_id via direct regex:', match[1]);
            return {
                asset_id: match[1],
                plant_id: '',
                category: ''
            };
        }

        // Method 4: If it looks like a UUID (with or without dashes)
        const uuidMatch = data.match(/^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/);
        if (uuidMatch) {
            console.log('[QR Parse] Detected UUID format:', data);
            return {
                asset_id: data.trim(),
                plant_id: '',
                category: ''
            };
        }

        console.log('[QR Parse] Could not extract asset_id from QR data');
        return null;
    };

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        console.log('[QR Scan] Raw QR data:', data);

        try {
            // Parse QR code data - try multiple methods to extract asset_id
            const qrData = parseQRCode(data);
            console.log('[QR Scan] Parsed QR data:', qrData);

            if (!qrData) {
                Alert.alert(
                    "Invalid QR Code",
                    `Could not find asset_id in this QR code.\n\nExpected format:\n{"asset_id":"<uuid>",...}`,
                    [{ text: "Scan Again", onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            console.log('[QR Scan] Fetching services for asset:', qrData.asset_id);
            // Fetch services for this asset
            const response = await dashboardService.getServicesByAsset(qrData.asset_id);

            if (response.success && response.data) {
                const { asset, services, servicesCount } = response.data;

                if (servicesCount === 0) {
                    Alert.alert(
                        "No Services Today",
                        `Asset: ${asset.assetId}\n${asset.category?.name || 'Asset'} at ${asset.plant?.plantName || 'Unknown Plant'}\n\nNo services are scheduled for today for this asset.`,
                        [
                            {
                                text: "Scan Another",
                                onPress: () => setScanned(false)
                            }
                        ]
                    );
                } else {
                    // Navigate to asset services screen
                    router.push({
                        pathname: '/asset-services/[assetId]',
                        params: {
                            assetId: qrData.asset_id,
                            plantId: qrData.plant_id,
                            category: qrData.category,
                            assetName: asset.assetId,
                            plantName: asset.plant?.plantName || '',
                            servicesCount: servicesCount.toString()
                        }
                    });
                }
            } else {
                Alert.alert(
                    "Asset Not Found",
                    "Could not find this asset or you don't have any services assigned for it.",
                    [{ text: "Scan Again", onPress: () => setScanned(false) }]
                );
            }
        } catch (error: any) {
            console.error('QR Scan Error:', error);
            console.error('QR Scan Error Response:', error.response?.data);
            console.error('QR Scan Error Status:', error.response?.status);

            const errorMessage = error.response?.data?.message ||
                error.response?.data?.msg ||
                (error.response?.status === 400 ? 'Bad request - check asset ID format' :
                    error.response?.status === 404 ? 'Asset or technician not found' :
                        'Failed to fetch asset services');

            Alert.alert(
                "Error",
                `${errorMessage}\n\nAsset ID: ${data}`,
                [{ text: "Scan Again", onPress: () => setScanned(false) }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
            <View style={{ flex: 1, position: 'relative' }}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                />

                {/* Top Overlay */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    paddingTop: 16,
                    paddingHorizontal: 20,
                    paddingBottom: 24,
                    backgroundColor: 'rgba(0,0,0,0.6)'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <QrCode size={24} color="#f97316" />
                            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
                                Scan Asset QR
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 }}
                        >
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Center Frame */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <View style={{
                        width: 260,
                        height: 260,
                        borderWidth: 3,
                        borderColor: '#f97316',
                        borderRadius: 24,
                        backgroundColor: 'transparent',
                        position: 'relative'
                    }}>
                        {/* Corner accents */}
                        <View style={{ position: 'absolute', top: -3, left: -3, width: 40, height: 40, borderTopWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderTopLeftRadius: 24 }} />
                        <View style={{ position: 'absolute', top: -3, right: -3, width: 40, height: 40, borderTopWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderTopRightRadius: 24 }} />
                        <View style={{ position: 'absolute', bottom: -3, left: -3, width: 40, height: 40, borderBottomWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderBottomLeftRadius: 24 }} />
                        <View style={{ position: 'absolute', bottom: -3, right: -3, width: 40, height: 40, borderBottomWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderBottomRightRadius: 24 }} />
                    </View>
                </View>

                {/* Bottom Info */}
                <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 24,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24
                }}>
                    <View style={{
                        backgroundColor: 'rgba(249,115,22,0.2)',
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 16
                    }}>
                        <Scan size={20} color="#f97316" />
                        <Text style={{ color: '#f97316', marginLeft: 12, fontWeight: '500' }}>
                            Align QR code within the frame
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12, marginRight: 12 }}>
                            <Package size={20} color="#9ca3af" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: 'white', fontWeight: '600', marginBottom: 2 }}>
                                View Today's Services
                            </Text>
                            <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                                Scan asset QR to see services scheduled for today
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Loading Overlay */}
                {loading && (
                    <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <View style={{
                            backgroundColor: '#ffffff',
                            padding: 32,
                            borderRadius: 24,
                            alignItems: 'center',
                            minWidth: 200
                        }}>
                            <ActivityIndicator size="large" color="#f97316" />
                            <Text style={{ color: '#1f2937', marginTop: 16, fontWeight: 'bold', fontSize: 16 }}>
                                Fetching Services...
                            </Text>
                            <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 13 }}>
                                Please wait
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
