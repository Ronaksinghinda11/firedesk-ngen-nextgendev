import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { trainingApi, Training } from '@/services/api/samsApi';
import { useToast } from '@/components/ui/use-toast';

const TrainingView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTraining();
    }
  }, [id]);

  const fetchTraining = async () => {
    try {
      setLoading(true);
      const response = await trainingApi.getById(id!);
      setTraining(response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load training",
        variant: "destructive"
      });
      navigate('/admin/sams/trainings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'Incident': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Audit': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Scheduled': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!training) {
    return null;
  }

  const attendanceStats = {
    total: training.attendances?.length || 0,
    attended: training.attendances?.filter(a => a.attended).length || 0,
    PENDING: training.attendances?.filter(a => !a.attended).length || 0,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/sams/trainings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{training.trainingNumber}</h1>
            <p className="text-gray-600">{training.trainingName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getSourceTypeColor(training.sourceType)}>
            {training.sourceType}
          </Badge>
          <Badge variant="outline" className={getStatusColor(training.status)}>
            {training.status}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="attendance">
            Attendance ({attendanceStats.attended}/{attendanceStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Training Type</p>
                  <p className="mt-1">{training.trainingType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Scheduled Date</p>
                  <p className="mt-1">
                    {new Date(training.scheduledDate).toLocaleDateString()}
                    {training.scheduledTime && ` at ${training.scheduledTime}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plant</p>
                  <p className="mt-1">{training.plantId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Building</p>
                  <p className="mt-1">{training.buildingId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Venue</p>
                  <p className="mt-1">{training.venue || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Trainer</p>
                  <p className="mt-1">
                    {training.trainerUserId || training.trainerName || 'N/A'}
                  </p>
                </div>
              </div>

              {training.outcome && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Outcome</p>
                    <p className="text-gray-900">{training.outcome}</p>
                  </div>
                </>
              )}

              {training.conclusion && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Conclusion</p>
                    <p className="text-gray-900">{training.conclusion}</p>
                  </div>
                </>
              )}

              {training.trainingRecordsUrl && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Training Records</p>
                    <a
                      href={training.trainingRecordsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Records
                    </a>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Attendance Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{attendanceStats.total}</p>
                  <p className="text-sm text-gray-600">Total Participants</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{attendanceStats.attended}</p>
                  <p className="text-sm text-gray-600">Attended</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{attendanceStats.PENDING}</p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Participant Attendance</CardTitle>
              <CardDescription>
                Track attendance and feedback for this training session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!training.attendances || training.attendances.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No participants assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {training.attendances.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {attendance.attended ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Clock className="h-6 w-6 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{attendance.userId}</p>
                          {attendance.feedback && (
                            <p className="text-sm text-gray-600 mt-1">{attendance.feedback}</p>
                          )}
                          {attendance.attendanceMarkedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Marked on {new Date(attendance.attendanceMarkedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {attendance.certificateUrl && (
                          <a
                            href={attendance.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Certificate
                          </a>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            attendance.attended
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }
                        >
                          {attendance.attended ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingView;
