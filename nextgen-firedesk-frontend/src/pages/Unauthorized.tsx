import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-4 text-4xl font-bold">Unauthorized</h1>
        <p className="mt-2 text-xl text-muted-foreground">
          You don't have permission to access this page
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Go to Login</Link>
        </Button>
      </div>
    </div>
  );
}
