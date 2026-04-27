import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { incidentService } from '../../services/incident';
import { ArrowLeft, AlertTriangle, MapPin, FileText, AlertCircle } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

export default function CreateIncidentScreen() {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [subtypes, setSubtypes] = useState<any[]>([]);
    const [plants, setPlants] = useState<any[]>([]);
    const [buildings, setBuildings] = useState<any[]>([]);
    const [floors, setFloors] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        incidentSubtypeId: '',
        incidentDate: new Date().toISOString().split('T')[0],
        plantId: '',
        buildingId: '',
        floorId: '',
        description: '',
        impact: '',
        severity: 'Medium',
    });

    const router = useRouter();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (formData.plantId) {
            loadBuildings(formData.plantId);
            setFormData(prev => ({ ...prev, buildingId: '', floorId: '' }));
            setBuildings([]);
            setFloors([]);
        }
    }, [formData.plantId]);

    useEffect(() => {
        if (formData.buildingId) {
            loadFloors(formData.buildingId);
            setFormData(prev => ({ ...prev, floorId: '' }));
            setFloors([]);
        }
    }, [formData.buildingId]);

    const loadInitialData = async () => {
        try {
            setInitialLoading(true);
            const [subtypesRes, plantsRes] = await Promise.all([
                incidentService.getIncidentSubtypes(),
                incidentService.getPlants()
            ]);
            setSubtypes(subtypesRes.data.data || []);
            setPlants(plantsRes.data.technician?.plants || []);
        } catch (error) {
            console.error('Error loading initial data:', error);
            Alert.alert('Error', 'Failed to load form data. Please try again.');
        } finally {
            setInitialLoading(false);
        }
    };

    const loadBuildings = async (plantId: string) => {
        try {
            const res = await incidentService.getBuildings(plantId);
            setBuildings(res.data.data || []);
        } catch (error) {
            console.error('Error loading buildings:', error);
        }
    };

    const loadFloors = async (buildingId: string) => {
        try {
            const res = await incidentService.getFloors(buildingId);
            setFloors(res.data.data || []);
        } catch (error) {
            console.error('Error loading floors:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Low': return { bg: '#dcfce7', text: '#16a34a', border: '#86efac' };
            case 'Medium': return { bg: '#fef3c7', text: '#d97706', border: '#fde047' };
            case 'High': return { bg: '#fed7aa', text: '#ea580c', border: '#fdba74' };
            case 'Critical': return { bg: '#fecaca', text: '#dc2626', border: '#fca5a5' };
            default: return { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
        }
    };

    const handleSubmit = async () => {
        if (!formData.incidentSubtypeId) {
            Alert.alert('Missing Information', 'Please select an incident type');
            return;
        }
        if (!formData.plantId) {
            Alert.alert('Missing Information', 'Please select a plant');
            return;
        }
        if (!formData.description || formData.description.trim().length < 10) {
            Alert.alert('Missing Information', 'Description must be at least 10 characters');
            return;
        }
        if (!formData.impact || formData.impact.trim().length < 10) {
            Alert.alert('Missing Information', 'Impact must be at least 10 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await incidentService.createIncident(formData);
            console.log('[Create Incident] Success response:', response.data);
            Alert.alert('Success', 'Incident reported successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Error creating incident:', error);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error?.message ||
                (error.response?.data?.error?.details?.[0]?.message) ||
                'Failed to report incident';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#f97316" />
                    <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading form...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <View style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#f3f4f6',
                flexDirection: 'row',
                alignItems: 'center'
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ backgroundColor: '#fff7ed', padding: 10, borderRadius: 12, marginRight: 12 }}
                >
                    <ArrowLeft size={20} color="#f97316" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Report Incident</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>Fill in the details below</Text>
                </View>
                <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 12 }}>
                    <AlertTriangle size={20} color="#dc2626" />
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 60 + insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Incident Type Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 10, marginRight: 10 }}>
                            <AlertCircle size={18} color="#f97316" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>Incident Type *</Text>
                    </View>
                    <View style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        overflow: 'hidden'
                    }}>
                        <Picker
                            selectedValue={formData.incidentSubtypeId}
                            onValueChange={(itemValue) => setFormData({ ...formData, incidentSubtypeId: itemValue })}
                            style={{ color: formData.incidentSubtypeId ? '#1f2937' : '#9ca3af' }}
                            dropdownIconColor="#6b7280"
                        >
                            <Picker.Item label="Select incident type..." value="" color="#9ca3af" />
                            {subtypes.map(st => (
                                <Picker.Item key={st.id} label={st.subtypeName} value={st.id} color="#1f2937" />
                            ))}
                        </Picker>
                    </View>
                </View>

                {/* Location Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 10, marginRight: 10 }}>
                            <MapPin size={18} color="#f97316" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>Location</Text>
                    </View>

                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Plant *</Text>
                    <View style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e5e7eb',
                        marginBottom: 12,
                        overflow: 'hidden'
                    }}>
                        <Picker
                            selectedValue={formData.plantId}
                            onValueChange={(itemValue) => setFormData({ ...formData, plantId: itemValue })}
                            style={{ color: formData.plantId ? '#1f2937' : '#9ca3af' }}
                            dropdownIconColor="#6b7280"
                        >
                            <Picker.Item label="Select plant..." value="" color="#9ca3af" />
                            {plants.map(p => (
                                <Picker.Item key={p.id} label={p.plantName} value={p.id} color="#1f2937" />
                            ))}
                        </Picker>
                    </View>

                    {formData.plantId && buildings.length > 0 && (
                        <>
                            <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Building (Optional)</Text>
                            <View style={{
                                backgroundColor: '#f9fafb',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                marginBottom: 12,
                                overflow: 'hidden'
                            }}>
                                <Picker
                                    selectedValue={formData.buildingId}
                                    onValueChange={(itemValue) => setFormData({ ...formData, buildingId: itemValue })}
                                    style={{ color: formData.buildingId ? '#1f2937' : '#9ca3af' }}
                                    dropdownIconColor="#6b7280"
                                >
                                    <Picker.Item label="Select building..." value="" color="#9ca3af" />
                                    {buildings.map(b => (
                                        <Picker.Item key={b.id} label={b.buildingName} value={b.id} color="#1f2937" />
                                    ))}
                                </Picker>
                            </View>
                        </>
                    )}

                    {formData.buildingId && floors.length > 0 && (
                        <>
                            <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Floor (Optional)</Text>
                            <View style={{
                                backgroundColor: '#f9fafb',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                overflow: 'hidden'
                            }}>
                                <Picker
                                    selectedValue={formData.floorId}
                                    onValueChange={(itemValue) => setFormData({ ...formData, floorId: itemValue })}
                                    style={{ color: formData.floorId ? '#1f2937' : '#9ca3af' }}
                                    dropdownIconColor="#6b7280"
                                >
                                    <Picker.Item label="Select floor..." value="" color="#9ca3af" />
                                    {floors.map(f => (
                                        <Picker.Item key={f.id} label={f.floorName} value={f.id} color="#1f2937" />
                                    ))}
                                </Picker>
                            </View>
                        </>
                    )}
                </View>

                {/* Severity Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 10, marginRight: 10 }}>
                            <AlertTriangle size={18} color="#f97316" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>Severity Level *</Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {['Low', 'Medium', 'High', 'Critical'].map((level) => {
                            const colors = getSeverityColor(level);
                            const isSelected = formData.severity === level;
                            return (
                                <TouchableOpacity
                                    key={level}
                                    onPress={() => setFormData({ ...formData, severity: level })}
                                    style={{
                                        backgroundColor: isSelected ? colors.bg : '#f9fafb',
                                        borderWidth: 2,
                                        borderColor: isSelected ? colors.border : '#e5e7eb',
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        borderRadius: 10,
                                        minWidth: 80,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{
                                        color: isSelected ? colors.text : '#6b7280',
                                        fontWeight: isSelected ? '600' : '500',
                                        fontSize: 14
                                    }}>
                                        {level}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Description Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#fff7ed', padding: 8, borderRadius: 10, marginRight: 10 }}>
                            <FileText size={18} color="#f97316" />
                        </View>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>Details</Text>
                    </View>

                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Description * (min 10 characters)</Text>
                    <TextInput
                        style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            padding: 14,
                            minHeight: 100,
                            textAlignVertical: 'top',
                            color: '#1f2937',
                            fontSize: 15,
                            marginBottom: 16
                        }}
                        multiline
                        placeholder="Describe what happened in detail..."
                        placeholderTextColor="#9ca3af"
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                    />

                    <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 6 }}>Impact * (min 10 characters)</Text>
                    <TextInput
                        style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            padding: 14,
                            minHeight: 80,
                            textAlignVertical: 'top',
                            color: '#1f2937',
                            fontSize: 15
                        }}
                        multiline
                        placeholder="What was the impact? (e.g., injuries, damage, disruption)"
                        placeholderTextColor="#9ca3af"
                        value={formData.impact}
                        onChangeText={(text) => setFormData({ ...formData, impact: text })}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    style={{
                        backgroundColor: '#f97316',
                        borderRadius: 14,
                        paddingVertical: 16,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 8,
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
                            <AlertTriangle size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                                Submit Incident Report
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Info Note */}
                <View style={{
                    backgroundColor: '#fff7ed',
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 16,
                    flexDirection: 'row',
                    alignItems: 'flex-start'
                }}>
                    <AlertCircle size={18} color="#f97316" style={{ marginTop: 2 }} />
                    <Text style={{ color: '#9a3412', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 18 }}>
                        Your incident report will be reviewed by the safety team. You may be contacted for additional information.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
