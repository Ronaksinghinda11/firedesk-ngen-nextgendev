import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { technicianTicketApi, Ticket } from '@/services/api/technicianTicketApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    ArrowRight,
    Ticket as TicketIcon,
    TrendingUp,
    Activity,
    Star,
    Zap,
    MapPin,
    Building2,
    Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function TechnicianTickets() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await technicianTicketApi.getMyTickets();
            setTickets(response.tickets || []);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Badge className="bg-orange-100 text-orange-800 border-orange-300 px-3 py-1">Pending</Badge>;
            case 'In Progress':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-300 px-3 py-1">In Progress</Badge>;
            case 'Waiting for approval':
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1">Waiting Approval</Badge>;
            case 'Completed':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 px-3 py-1">Completed</Badge>;
            case 'Rejected':
                return <Badge variant="destructive" className="px-3 py-1">Rejected</Badge>;
            default:
                return <Badge variant="outline" className="px-3 py-1">{status}</Badge>;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pending':
                return <Clock className="h-5 w-5 text-orange-500" />;
            case 'In Progress':
                return <Activity className="h-5 w-5 text-blue-500" />;
            case 'Waiting for approval':
                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
            case 'Completed':
                return <CheckCircle className="h-5 w-5 text-emerald-500" />;
            case 'Rejected':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return <TicketIcon className="h-5 w-5 text-blue-500" />;
        }
    };

    const filterTickets = (status: string) => {
        if (status === 'all') return tickets;
        return tickets.filter(ticket => ticket.completedStatus === status);
    };

    const TicketCard = ({ ticket }: { ticket: Ticket }) => (
        <Card
            className="group relative overflow-hidden border-2 border-slate-100 hover:border-blue-200 bg-white/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]"
            onClick={() => navigate(`/technician/tickets/${ticket.id}`)}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ticket.completedStatus === 'Pending' ? 'bg-orange-500' :
                ticket.completedStatus === 'Waiting for approval' ? 'bg-yellow-500' :
                    ticket.completedStatus === 'Completed' ? 'bg-emerald-500' :
                        ticket.completedStatus === 'Rejected' ? 'bg-rose-500' : 'bg-blue-500'
                }`} />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-slate-100`}>
                                {getStatusIcon(ticket.completedStatus)}
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                {ticket.taskName}
                            </CardTitle>
                        </div>
                        <CardDescription className="text-sm font-semibold text-slate-500 tracking-wide uppercase">
                            {ticket.ticketId} • {ticket.category?.categoryName || 'N/A'}
                        </CardDescription>
                    </div>
                    {getStatusBadge(ticket.completedStatus)}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {ticket.taskDescription && (
                        <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed italic">
                            "{ticket.taskDescription}"
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold">Due: {new Date(ticket.targetDate).toLocaleDateString('en-GB')}</span>
                        </div>
                        {ticket.asset && (
                            <div className="flex items-center gap-2 text-slate-700">
                                <Package className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-bold truncate">Asset: {ticket.asset.assetId}</span>
                            </div>
                        )}
                    </div>

                    {ticket.building && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                {ticket.building.buildingName}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                        Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const PENDINGTickets = filterTickets('Pending');
    const inProgressTickets = filterTickets('In Progress');
    const waitingTickets = filterTickets('Waiting for approval');
    const completedTickets = filterTickets('Completed');
    const rejectedTickets = filterTickets('Rejected');

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                                <TicketIcon className="h-6 w-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900">My Tickets</h1>
                        </div>
                        <p className="text-slate-600 text-base">View and manage your assigned high-priority tickets</p>
                    </div>
                    <Button
                        onClick={fetchTickets}
                        variant="outline"
                        className="gap-2 shadow-sm transition-all duration-300 border-slate-300"
                        disabled={loading}
                    >
                        <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                                    <Clock className="h-6 w-6 text-white" />
                                </div>
                                <TrendingUp className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="text-3xl font-bold mb-1">{PENDINGTickets.length}</div>
                            <div className="text-sm text-white/80 font-bold uppercase tracking-wider">Pending</div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                                    <Activity className="h-6 w-6 text-white" />
                                </div>
                                <Zap className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="text-3xl font-bold mb-1">{inProgressTickets.length}</div>
                            <div className="text-sm text-white/80 font-bold uppercase tracking-wider">In Progress</div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                                    <Zap className="h-6 w-6 text-white" />
                                </div>
                                <Star className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="text-3xl font-bold mb-1">{waitingTickets.length}</div>
                            <div className="text-sm text-white/80 font-bold uppercase tracking-wider">Waiting Approval</div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                                    <CheckCircle className="h-6 w-6 text-white" />
                                </div>
                                <Activity className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="text-3xl font-bold mb-1">{completedTickets.length}</div>
                            <div className="text-sm text-white/80 font-bold uppercase tracking-wider">Completed</div>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between mb-2">
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                                    <XCircle className="h-6 w-6 text-white" />
                                </div>
                                <AlertCircle className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="text-3xl font-bold mb-1">{rejectedTickets.length}</div>
                            <div className="text-sm text-white/80 font-bold uppercase tracking-wider">Rejected</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tickets List */}
            <Card className="border-0 shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
                    <CardTitle className="text-2xl font-bold text-slate-900">Ticket Queue</CardTitle>
                    <CardDescription className="text-slate-600 font-medium">Filter and manage tickets by their current status</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-6 w-full mb-8 bg-slate-100 p-1.5 rounded-xl h-auto shadow-sm">
                            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-md font-bold py-3 transition-all">All ({tickets.length})</TabsTrigger>
                            <TabsTrigger value="Pending" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-orange-600 font-bold py-3 transition-all">Pending ({PENDINGTickets.length})</TabsTrigger>
                            <TabsTrigger value="In Progress" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 font-bold py-3 transition-all">In Progress ({inProgressTickets.length})</TabsTrigger>
                            <TabsTrigger value="Waiting for approval" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-yellow-700 font-bold py-3 transition-all">Waiting ({waitingTickets.length})</TabsTrigger>
                            <TabsTrigger value="Completed" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600 font-bold py-3 transition-all">Completed ({completedTickets.length})</TabsTrigger>
                            <TabsTrigger value="Rejected" className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-rose-600 font-bold py-3 transition-all">Rejected ({rejectedTickets.length})</TabsTrigger>
                        </TabsList>

                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest">Hydrating Ticket Data...</p>
                                </div>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-200">
                                <div className="bg-slate-100 p-6 rounded-full mb-4">
                                    <TicketIcon className="h-10 w-10 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-bold text-lg">No tickets assigned yet</p>
                                <p className="text-slate-400 text-sm">When you receive new assignments, they'll appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filterTickets(activeTab).length === 0 ? (
                                    <div className="col-span-full py-20 text-center">
                                        <p className="text-slate-500 font-bold italic">No tickets found with status: {activeTab}</p>
                                    </div>
                                ) : (
                                    filterTickets(activeTab).map(ticket => (
                                        <TicketCard key={ticket.id} ticket={ticket} />
                                    ))
                                )}
                            </div>
                        )}
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
