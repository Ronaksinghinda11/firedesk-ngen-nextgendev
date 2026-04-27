import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Eye,
  AlertCircle,
  ArrowLeft,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Search,
  Activity,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { userApi, Incident } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';
import { TechnicianLayout } from '@/components/TechnicianLayout';

const MyIncidents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, PENDINGApproval: 0 });

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const response = await userApi.getMyIncidents();
      setIncidents(response.data);

      // Calculate stats
      const total = response.data.length;
      const inProgress = response.data.filter((i: Incident) =>
        ['Assigned', 'Under Review', 'In CAPA'].includes(i.status)
      ).length;
      const PENDINGApproval = response.data.filter((i: Incident) =>
        i.status === 'Pending Approval'
      ).length;

      setStats({ total, inProgress, PENDINGApproval });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load assigned incidents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical': return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold uppercase text-[10px]">Critical</Badge>;
      case 'High': return <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold uppercase text-[10px]">High</Badge>;
      case 'Medium': return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold uppercase text-[10px]">Medium</Badge>;
      case 'Low': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold uppercase text-[10px]">Low</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-bold uppercase text-[10px]">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">Open</Badge>;
      case 'Assigned': return <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold">Assigned</Badge>;
      case 'Under Review': return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">Under Review</Badge>;
      case 'In CAPA': return <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold">In CAPA</Badge>;
      case 'Pending Approval': return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold">Pending Approval</Badge>;
      case 'Closed': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">Closed</Badge>;
      case 'Rejected': return <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold">Rejected</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-bold">{status}</Badge>;
    }
  };

  const getCapaProgress = (incident: Incident) => {
    if (!incident.capaSteps || incident.capaSteps.length === 0) return '0%';

    const approved = incident.capaSteps.filter(s => s.status === 'Approved').length;
    const total = incident.capaSteps.length;
    const percentage = Math.round((approved / total) * 100);

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-slate-500">{approved}/{total}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <TechnicianLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500 mb-6"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest animate-pulse">Scanning Incident Database...</p>
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <div className="max-w-7xl mx-auto pb-12 space-y-8">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/technician/dashboard')}
              className="h-12 w-12 rounded-xl border-slate-200 hover:bg-white hover:shadow-md transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Assigned Incidents</h1>
              <p className="text-slate-500 font-medium">Safety Management Operations Hub</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/technician/sams/incidents/create')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5 mr-3" />
            Report New Incident
          </Button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white group hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                  <Search className="h-6 w-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-white/60 font-bold uppercase tracking-widest text-xs">Total Assigned</CardDescription>
              <CardTitle className="text-4xl font-black">{stats.total}</CardTitle>
            </CardHeader>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          </Card>

          <Card className="border-0 shadow-xl overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500"></div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-indigo-100 p-2.5 rounded-xl">
                  <Activity className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-xs">Active Investigations</CardDescription>
              <CardTitle className="text-4xl font-black text-slate-900">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-xl overflow-hidden bg-white group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500"></div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-amber-100 p-2.5 rounded-xl">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-xs">Pending Approval</CardDescription>
              <CardTitle className="text-4xl font-black text-slate-900">{stats.PENDINGApproval}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Records Table */}
        <Card className="border-0 shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl rounded-[2rem] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Incident Registry</CardTitle>
                <CardDescription className="font-medium text-slate-500">List of all occurrences where you are registered as Team Leader</CardDescription>
              </div>
              <div className="relative group w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="w-full bg-slate-50 border-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm font-semibold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <ShieldAlert className="h-12 w-12 text-slate-300" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-800">Clear Records</h3>
                <p className="text-slate-500 font-medium max-w-xs mx-auto mt-1">No active incidents require your intervention at this moment.</p>
              </div>
            ) : (
              <div className="px-8 pb-8">
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Identity Reference</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Classification</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Facility</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Criticality</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Workflow Status</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">CAPA Status</TableHead>
                        <TableHead className="font-bold text-slate-900 uppercase tracking-widest text-[10px] py-6">Log Date</TableHead>
                        <TableHead className="text-right py-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                          <TableCell className="font-bold text-slate-900 py-4">{incident.incidentNumber}</TableCell>
                          <TableCell className="font-semibold text-slate-600 py-4">{incident.subtype?.subtypeName}</TableCell>
                          <TableCell className="font-semibold text-slate-600 py-4">{incident.plant?.plantName}</TableCell>
                          <TableCell className="py-4">
                            {getSeverityBadge(incident.severity)}
                          </TableCell>
                          <TableCell className="py-4">
                            {getStatusBadge(incident.status)}
                          </TableCell>
                          <TableCell className="py-4">{getCapaProgress(incident)}</TableCell>
                          <TableCell className="font-medium text-slate-500 text-sm py-4">
                            {new Date(incident.incidentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold transition-all shadow-sm"
                              onClick={() => navigate(`/technician/sams/incidents/${incident.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Audit View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-8 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between text-indigo-700">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Historical performance data is currently synchronizing</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TechnicianLayout>
  );
};

export default MyIncidents;
