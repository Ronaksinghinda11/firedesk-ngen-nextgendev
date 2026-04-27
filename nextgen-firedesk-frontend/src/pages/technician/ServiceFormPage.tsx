/**
 * Service Form Page for Technicians
 * Allows technicians to fill out and submit service forms
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Package,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Activity,
  FileText,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import technicianServicesApi from '@/services/api/technicianServicesApi';
import DynamicServiceForm from '@/components/ServiceForms/Technician/DynamicServiceForm';

export default function ServiceFormPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serviceData, setServiceData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(null);
  const [isBeforeDueDate, setIsBeforeDueDate] = useState(false);

  useEffect(() => {
    if (serviceId) {
      fetchServiceForm();
    }
  }, [serviceId]);

  const fetchServiceForm = async () => {
    try {
      setLoading(true);
      const response = await technicianServicesApi.getServiceForm(serviceId!);

      if (response.success) {
        setServiceData(response.data.service);
        setFormData(response.data.form);

        // Check if before due date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(response.data.service.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);

        setIsBeforeDueDate(today < scheduledDate);
      } else {
        throw new Error(response.message || 'Failed to fetch service form');
      }
    } catch (error: any) {
      console.error('Error fetching service form:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load service form',
        variant: 'destructive',
      });
      navigate('/technician/my-services');
    } finally {
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    if (!serviceId) return;

    try {
      await technicianServicesApi.startService(serviceId);
      toast({
        title: 'Success',
        description: 'Service marked as In-Progress',
      });
      // Refresh data
      fetchServiceForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start service',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (answers: any[]) => {
    if (!serviceId) return;

    try {
      await technicianServicesApi.submitServiceForm(serviceId, answers);

      toast({
        title: 'Success',
        description: 'Service form submitted successfully',
      });

      navigate('/technician/my-services');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit form',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending' },
      IN_PROGRESS: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'In Progress' },
      SUBMITTED: { className: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: 'Submitted' },
      COMPLETED: { className: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Completed' },
      REJECTED: { className: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Rejected' },
    };

    const config = statusConfig[status] || { className: 'bg-slate-100 text-slate-800 border-slate-300', label: status };
    return (
      <Badge className={`${config.className} px-3 py-1 font-bold border`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 mb-4"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Inspection Protocol...</p>
      </div>
    );
  }

  if (!serviceData || !formData) {
    return (
      <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200">
        <AlertTriangle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Form Not Initialized</h2>
        <p className="text-slate-500 mb-6">The requested service form could not be located in the database.</p>
        <Button onClick={() => navigate('/technician/my-services')}>Return to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Header Navigation */}
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
              Form Workflow
            </h1>
            <p className="text-slate-500 font-medium">Inspection Identification Protocol</p>
          </div>
        </div>
      </div>

      {isBeforeDueDate && (
        <div className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-lg">Premature Access Warning</h3>
            <p className="text-amber-700 font-medium mt-1">
              This service is scheduled for <span className="font-bold">{new Date(serviceData.scheduledDate).toLocaleDateString()}</span>.
              Entry is currently in <span className="underline decoration-2 font-bold italic">Read-Only mode</span> until the scheduled date arrives.
            </p>
          </div>
        </div>
      )}

      {/* Global Service Info Banner */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-2xl border-0 mb-8 rounded-3xl">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 backdrop-blur-3xl animate-pulse"></div>

        <CardHeader className="relative pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl md:text-4xl font-extrabold tracking-tight">
                  {formData.serviceName}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-indigo-100 font-bold uppercase tracking-[0.1em] text-xs">
                <span>Protocol #{serviceData.submissionNumber}</span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>Reference {formData.formCode}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {getStatusBadge(serviceData.status)}
              <Badge variant="outline" className="border-white/30 text-white font-bold backdrop-blur-sm px-4 py-1 uppercase tracking-tighter">
                {serviceData.inspectionType}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Asset Details */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 group hover:bg-white/20 transition-all duration-300 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl shadow-inner">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block mb-0.5">Asset Registry</label>
                  <p className="font-extrabold text-lg leading-none">
                    {serviceData.asset?.assetId || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Geo Spot */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 group hover:bg-white/20 transition-all duration-300 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl shadow-inner">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="truncate">
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block mb-0.5">Geo Location</label>
                  <p className="font-extrabold text-lg leading-none truncate">
                    {serviceData.asset?.location || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Structure */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 group hover:bg-white/20 transition-all duration-300 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl shadow-inner">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="truncate">
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block mb-0.5">Sub-Structure</label>
                  <p className="font-extrabold text-lg leading-none truncate">
                    {serviceData.asset?.building || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 group hover:bg-white/20 transition-all duration-300 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl shadow-inner">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest block mb-0.5">Compliance Date</label>
                  <p className="font-extrabold text-lg leading-none">
                    {new Date(serviceData.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {serviceData.startedAt && (
            <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-4 text-xs font-bold uppercase tracking-widest opacity-80">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Work Commencement: {new Date(serviceData.startedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Panel */}
      {serviceData.status === 'PENDING' && (
        <Card className="mb-8 border-2 border-indigo-100 shadow-xl overflow-hidden rounded-3xl animate-in zoom-in-95 duration-500">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="bg-indigo-100 p-4 rounded-3xl text-indigo-600">
                  <Activity className="h-10 w-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-2xl text-slate-900">Initiate Workflow</h3>
                  <p className="text-slate-600 font-medium max-w-md mt-1">
                    Technician must mark this service as <span className="text-indigo-600 font-bold">Active</span> before field entries can be recorded according to compliance guidelines.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleStartService}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-8 rounded-2xl text-xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] transition-all hover:scale-105"
              >
                <Play className="h-6 w-6 mr-3 fill-current" />
                Activate Inspection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Protocol Form */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 opacity-20"></div>

        {serviceData.status !== 'SUBMITTED' && serviceData.status !== 'COMPLETED' ? (
          <div className="space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="bg-slate-100 p-2 rounded-xl">
                <LayoutDashboard className="h-6 w-6 text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">Field Data Entry</h2>
            </div>

            <DynamicServiceForm
              serviceId={serviceId!}
              formData={formData}
              onSubmit={handleSubmit}
              readOnly={isBeforeDueDate}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl">
            <div className="bg-emerald-100 p-6 rounded-full mb-6 text-emerald-600">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Protocol Finalized</h2>
            <p className="text-slate-500 text-lg font-medium max-w-lg text-center leading-relaxed">
              {serviceData.status === 'SUBMITTED'
                ? "Your entries have been successfully transmitted to management for formal verification and quality control."
                : "This service protocol is now a permanent part of the facility audit trail."}
            </p>

            {serviceData.submittedAt && (
              <div className="mt-8 flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">
                  Log Transmitted: {new Date(serviceData.submittedAt).toLocaleString()}
                </span>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate('/technician/my-services')}
              className="mt-10 rounded-xl font-bold px-8"
            >
              Return to Operations Hub
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
