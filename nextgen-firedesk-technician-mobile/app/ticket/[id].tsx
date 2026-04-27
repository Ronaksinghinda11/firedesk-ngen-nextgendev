import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardService } from '../../services/dashboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Building2, Package, User, Send, CheckCircle, XCircle } from 'lucide-react-native';

interface TicketDetail {
    id: string;
    ticketId: string;
    taskName: string;
    taskDescription?: string;
    targetDate: string;
    completedStatus: string;
    ticketType?: string;
    plant?: {
        id: string;
        plantName: string;
    };
    asset?: {
        id: string;
        assetId: string;
        location?: string;
    };
    category?: {
        id: string;
        categoryName: string;
    };
    building?: {
        id: string;
        buildingName: string;
    };
    responses?: Array<{
        id: string;
        comment: string;
        responseType: string;
        isFixed: boolean;
        createdAt: string;
        user?: {
            id: string;
            name: string;
        };
    }>;
}

export default function TicketDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [ticket, setTicket] = useState<TicketDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [comment, setComment] = useState('');
    const [isFixed, setIsFixed] = useState(false);

    useEffect(() => {
        loadTicket();
    }, [id]);

    const loadTicket = async () => {
        try {
            const response = await dashboardService.getTicketById(id as string);
            setTicket(response?.data || response);
        } catch (error) {
            console.error('Error loading ticket:', error);
            Alert.alert('Error', 'Failed to load ticket details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!comment.trim()) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        setSubmitting(true);
        try {
            await dashboardService.submitTicket(id as string, { comment, isFixed });
            Alert.alert('Success', 'Ticket submitted successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Error submitting ticket:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        setSubmitting(true);
        try {
            await dashboardService.addTicketComment(id as string, comment);
            setComment('');
            loadTicket(); // Refresh to show new comment
            Alert.alert('Success', 'Comment added successfully');
        } catch (error: any) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return { bg: '#fff7ed', text: '#ea580c' };
            case 'completed':
                return { bg: '#dcfce7', text: '#16a34a' };
            case 'rejected':
                return { bg: '#fee2e2', text: '#dc2626' };
            case 'waiting for approval':
                return { bg: '#fef3c7', text: '#d97706' };
            default:
                return { bg: '#f3f4f6', text: '#6b7280' };
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#f97316" size="large" />
            </SafeAreaView>
        );
    }

    if (!ticket) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#1f2937' }}>Ticket not found</Text>
            </SafeAreaView>
        );
    }

    const statusColors = getStatusColor(ticket.completedStatus);
    const canSubmit = ticket.completedStatus?.toLowerCase() === 'pending';
    const canComment = ['pending', 'waiting for approval'].includes(ticket.completedStatus?.toLowerCase() || '');

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            
            {/* Header */}
            <View style={{ 
                backgroundColor: '#ffffff', 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingHorizontal: 16, 
                paddingVertical: 12, 
                borderBottomWidth: 1, 
                borderBottomColor: '#f3f4f6' 
            }}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={{ backgroundColor: '#f3f4f6', width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                >
                    <ArrowLeft size={20} color="#1f2937" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>{ticket.ticketId}</Text>
                    <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: 4 }}>
                        <Text style={{ color: statusColors.text, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>
                            {ticket.completedStatus}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                {/* Task Info */}
                <View style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: 16, 
                    padding: 16, 
                    marginTop: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{ticket.taskName}</Text>
                    {ticket.taskDescription && (
                        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>{ticket.taskDescription}</Text>
                    )}
                    
                    <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ backgroundColor: '#fff7ed', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                <Clock size={16} color="#f97316" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={{ color: '#9ca3af', fontSize: 11 }}>Due Date</Text>
                                <Text style={{ color: '#1f2937', fontSize: 14, fontWeight: '500' }}>
                                    {new Date(ticket.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </View>
                        </View>
                        
                        {ticket.plant && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ backgroundColor: '#eff6ff', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                    <Building2 size={16} color="#2563eb" />
                                </View>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>Plant</Text>
                                    <Text style={{ color: '#1f2937', fontSize: 14, fontWeight: '500' }}>{ticket.plant.plantName}</Text>
                                </View>
                            </View>
                        )}
                        
                        {ticket.asset && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ backgroundColor: '#dcfce7', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                    <Package size={16} color="#16a34a" />
                                </View>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>Asset</Text>
                                    <Text style={{ color: '#1f2937', fontSize: 14, fontWeight: '500' }}>
                                        {ticket.asset.assetId} {ticket.asset.location ? `• ${ticket.asset.location}` : ''}
                                    </Text>
                                </View>
                            </View>
                        )}
                        
                        {ticket.category && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ backgroundColor: '#faf5ff', width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                    <MapPin size={16} color="#8b5cf6" />
                                </View>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>Category</Text>
                                    <Text style={{ color: '#1f2937', fontSize: 14, fontWeight: '500' }}>{ticket.category.categoryName}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Previous Responses */}
                {ticket.responses && ticket.responses.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>History</Text>
                        {ticket.responses.map((response) => (
                            <View key={response.id} style={{ 
                                backgroundColor: '#ffffff', 
                                borderRadius: 14, 
                                padding: 14, 
                                marginBottom: 8, 
                                borderLeftWidth: 3, 
                                borderLeftColor: response.responseType === 'rejection' ? '#dc2626' : '#16a34a',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 1,
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ backgroundColor: '#f3f4f6', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                                            <User size={12} color="#6b7280" />
                                        </View>
                                        <Text style={{ color: '#6b7280', marginLeft: 6, fontSize: 13, fontWeight: '500' }}>{response.user?.name || 'Unknown'}</Text>
                                    </View>
                                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>
                                        {new Date(response.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={{ color: '#1f2937', fontSize: 14 }}>{response.comment}</Text>
                                {response.isFixed !== undefined && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                                        {response.isFixed ? (
                                            <CheckCircle size={14} color="#16a34a" />
                                        ) : (
                                            <XCircle size={14} color="#f97316" />
                                        )}
                                        <Text style={{ color: response.isFixed ? '#16a34a' : '#f97316', marginLeft: 6, fontSize: 12, fontWeight: '500' }}>
                                            {response.isFixed ? 'Marked as fixed' : 'Not fixed'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Submit/Comment Form */}
                {canComment && (
                    <View style={{ marginTop: 20, marginBottom: 100 }}>
                        <Text style={{ color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                            {canSubmit ? 'Submit Response' : 'Add Comment'}
                        </Text>
                        
                        <TextInput
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: 14,
                                padding: 16,
                                color: '#1f2937',
                                fontSize: 14,
                                minHeight: 100,
                                textAlignVertical: 'top',
                                borderWidth: 1,
                                borderColor: '#e5e7eb'
                            }}
                            placeholder="Enter your comment..."
                            placeholderTextColor="#9ca3af"
                            multiline
                            value={comment}
                            onChangeText={setComment}
                        />

                        {canSubmit && (
                            <TouchableOpacity
                                style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    marginTop: 12,
                                    padding: 14,
                                    backgroundColor: isFixed ? '#dcfce7' : '#ffffff',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: isFixed ? '#16a34a' : '#e5e7eb'
                                }}
                                onPress={() => setIsFixed(!isFixed)}
                            >
                                <View style={{ 
                                    width: 24, 
                                    height: 24, 
                                    borderRadius: 6, 
                                    borderWidth: 2, 
                                    borderColor: isFixed ? '#16a34a' : '#d1d5db',
                                    backgroundColor: isFixed ? '#16a34a' : 'transparent',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12
                                }}>
                                    {isFixed && <CheckCircle size={14} color="#fff" />}
                                </View>
                                <Text style={{ color: isFixed ? '#16a34a' : '#6b7280', fontSize: 14, fontWeight: '500' }}>
                                    Mark issue as fixed
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#f97316',
                                borderRadius: 14,
                                padding: 16,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginTop: 16,
                                opacity: submitting ? 0.7 : 1,
                                shadowColor: '#f97316',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                            onPress={canSubmit ? handleSubmit : handleAddComment}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Send size={18} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                                        {canSubmit ? 'Submit Response' : 'Add Comment'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {!canComment && (
                    <View style={{ 
                        backgroundColor: '#ffffff', 
                        borderRadius: 16, 
                        padding: 32, 
                        alignItems: 'center', 
                        marginTop: 20, 
                        marginBottom: 100,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <View style={{ backgroundColor: '#dcfce7', padding: 16, borderRadius: 999 }}>
                            <CheckCircle size={40} color="#16a34a" />
                        </View>
                        <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Ticket Closed</Text>
                        <Text style={{ color: '#6b7280', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                            This ticket has been {ticket.completedStatus?.toLowerCase()}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
