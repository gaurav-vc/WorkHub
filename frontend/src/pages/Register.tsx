import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, Loader2, ArrowRight } from 'lucide-react';
import { register as registerApi } from "@/api/auth";

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await registerApi({ username, email, password });
      toast.success('Access requested successfully. Pending admin approval.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Abstract Background Shapes for Right Side */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Panel: Branding & Hero */}
      <div className="hidden lg:flex w-1/2 relative bg-primary overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 mix-blend-multiply" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10 text-white max-w-lg animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-lg">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">Workhub</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Join the team.<br />
            <span className="text-white/80">Start building.</span>
          </h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Request access to your company's secure workspace and collaborate seamlessly across all departments.
          </p>
          
          <div className="flex items-center gap-4 text-sm font-medium text-white/70">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Secure Environment
            </div>
            <span>•</span>
            <div>Admin Approval Required</div>
          </div>
        </div>
      </div>

      {/* Right Panel: Register Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 z-10 animate-fade-in">
        <div className="w-full max-w-[400px] space-y-8">
          
          {/* Mobile Branding (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Workhub</h1>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Request Access</h2>
            <p className="text-muted-foreground text-sm">Fill out the details below to request a new account</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5 mt-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. john.doe"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background"
                />
                <p className="text-[11px] text-muted-foreground pt-1">Must be at least 8 characters long.</p>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground shadow-md transition-all hover:shadow-lg group" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <>
                  Submit Request
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm pt-6 border-t">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
