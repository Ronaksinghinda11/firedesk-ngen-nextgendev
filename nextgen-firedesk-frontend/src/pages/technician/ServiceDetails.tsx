/**
 * Technician Service Details Page
 * Displays detailed information about a specific service submission
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  FileText,
  Clock,
  Package,
  Wrench,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Play,
  XCircle,
  Activity,
  Info,
  Building
} from 'lucide-react';
import { technicianServicesApi, ServiceSubmission } from '@/services/api/technicianServicesApi';
import { format } from 'date-fns';

export default function ServiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceSubmission | null>(null);

  useEffect(() => {
    if (id) {
      loadServiceDetails();
    }
  }, [id]);

  const loadServiceDetails = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await technicianServicesApi.getMyServiceById(id);
      setService(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load service details');
      console.error('Failed to load service:', error);
      navigate('/technician/my-services');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-3 py-1">COMPLETED</Badge>;
      case 'SUBMITTED':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold px-3 py-1">SUBMITTED</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-bold px-3 py-1">IN_PROGRESS</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 font-bold px-3 py-1">PENDING</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold px-3 py-1">REJECTED</Badge>;
      case 'APPROVED':
        return <Badge className="bg-emerald-500 text-white font-bold px-3 py-1">APPROVED</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 font-bold px-3 py-1">{status}</Badge>;
    }
  };

  const getInspectionTypeBadge = (type: string) => {
    switch (type) {
      case 'Inspection':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase tracking-wider text-[10px]">Inspection</Badge>;
      case 'Testing':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold uppercase tracking-wider text-[10px]">Testing</Badge>;
      case 'Maintenance':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold uppercase tracking-wider text-[10px]">Maintenance</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 font-bold uppercase tracking-wider text-[10px]">{type}</Badge>;
    }
  };

  const handleStartService = () => {
    if (!id) return;
    navigate(`/technician/service-form/${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <p className="mt-6 text-slate-500 font-bold uppercase tracking-widest animate-pulse">Retrieving Service Artifacts...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200">
        <AlertCircle className="h-16 w-16 text-rose-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Service Not Found</h2>
        <p className="text-slate-500 mb-6">The service you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/technician/my-services')}>Return to Service List</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/technician/my-services')}
            className="h-12 w-12 rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                {service.submissionNumber}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(service.status)}
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              {getInspectionTypeBadge(service.inspectionType)}
            </div>
          </div>
        </div>

        {['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(service.status) && (
          <Button
            onClick={handleStartService}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 px-8 py-6 rounded-xl font-bold text-lg"
          >
            <Play className="h-5 w-5 mr-3 fill-current" />
            {service.status === 'PENDING' ? 'Start Service' : (service.status === 'REJECTED' ? 'Resubmit Form' : 'Continue Work')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Asset Overview Card */}
          {service.asset && (
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">Asset Parameters</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Inventory ID</label>
                      <p className="text-xl font-bold text-slate-900">{service.asset.assetId}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Operating Location</label>
                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {service.asset.location || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Facility Block</label>
                      <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <Building2 className="h-4 w-4 text-indigo-500" />
                        {service.asset.building?.building_name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Vertical Zone</label>
                      <p className="text-slate-700 font-bold uppercase">{service.asset.floor ? `Floor ${service.asset.floor}` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Protocol Card */}
          {service.form && (
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">Standard Service Protocol</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Compliance Form</label>
                    <p className="text-lg font-bold text-slate-900">{service.form.serviceName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Protocol Identifier</label>
                    <p className="text-slate-700 font-bold font-mono">{service.form.formCode}</p>
                  </div>
                </div>
                {service.form.description && (
                  <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">Scope of Work</label>
                    <p className="text-slate-600 text-sm italic leading-relaxed">
                      "{service.form.description}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Facility Context Card */}
          {service.asset?.plant && (
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-emerald-50/50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Building className="h-5 w-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">Plant Registry</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Assigned Plant</label>
                    <p className="text-xl font-bold text-slate-900">{service.asset.plant.plantName}</p>
                  </div>
                  {service.asset.plant.location && (
                    <div className="flex-1 md:text-right">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Global Positioning</label>
                      <p className="text-slate-600 font-medium">{service.asset.plant.location}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Timestamp Card */}
          <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm sticky top-24">
            <CardHeader className="bg-slate-900 border-b border-slate-800 text-white py-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Audit Timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {/* Scheduled */}
                <div className="p-4 flex items-start gap-4">
                  <div className="bg-indigo-50 p-2.5 rounded-xl">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Scheduled Target</label>
                    <p className="text-sm font-bold text-slate-900">
                      {service.scheduledDate && !isNaN(new Date(service.scheduledDate).getTime())
                        ? format(new Date(service.scheduledDate), 'PPP')
                        : 'Unscheduled'}
                    </p>
                    {service.frequency && (
                      <Badge variant="outline" className="mt-2 bg-slate-50 border-slate-200 text-slate-600 text-[10px] font-bold uppercase">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.frequency.frequencyName}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Started */}
                {service.startedAt && !isNaN(new Date(service.startedAt).getTime()) && (
                  <div className="p-4 flex items-start gap-4">
                    <div className="bg-blue-50 p-2.5 rounded-xl">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Work Initiation</label>
                      <p className="text-sm font-bold text-slate-900">
                        {format(new Date(service.startedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted */}
                {service.submittedAt && !isNaN(new Date(service.submittedAt).getTime()) && (
                  <div className="p-4 flex items-start gap-4">
                    <div className="bg-amber-50 p-2.5 rounded-xl">
                      <Info className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Form Finalization</label>
                      <p className="text-sm font-bold text-slate-900">
                        {format(new Date(service.submittedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed */}
                {service.completedAt && !isNaN(new Date(service.completedAt).getTime()) && (
                  <div className="p-4 flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Manager Approval</label>
                      <p className="text-sm font-bold text-slate-900">
                        {format(new Date(service.completedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Personnel */}
              {service.technician && (
                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Reporting Officer</label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{service.technician.user.name}</p>
                      <div className="flex items-center gap-1.5 opacity-60">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs font-semibold">{service.technician.user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Block */}
              {service.status === 'SUBMITTED' && (
                <div className="p-6 bg-blue-600 text-white text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="font-bold text-sm uppercase tracking-widest">Awaiting Verification</p>
                </div>
              )}

              {service.status === 'REJECTED' && (
                <div className="p-6 bg-rose-600 text-white text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-bold text-sm uppercase tracking-widest">Entry Rejected</p>
                </div>
              )}

              {service.status === 'COMPLETED' && (
                <div className="p-6 bg-emerald-600 text-white text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-bold text-sm uppercase tracking-widest">Protocol Satisfied</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
