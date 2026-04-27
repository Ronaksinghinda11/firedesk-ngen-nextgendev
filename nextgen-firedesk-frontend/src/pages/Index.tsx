import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to FireDesk</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Fire Safety Management System
        </p>
        {user ? (
          <Button asChild size="lg">
            <Link to="/admin">Go to Dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/login">Login</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Index;
