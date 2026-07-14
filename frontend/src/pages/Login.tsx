import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Layers, Loader2, ArrowRight } from 'lucide-react';
import { login as loginApi } from "@/api/auth";

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await loginApi({ username, password });
      toast.success('Logged in successfully');
      login(data.access, data.id, data.role, data.user_type);
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
            Your workspace,<br />
            <span className="text-white/80">supercharged.</span>
          </h2>
          <p className="text-lg text-white/80 mb-8 leading-relaxed">
            Connect teams, streamline workflows, and accelerate productivity with our all-in-one enterprise platform.
          </p>
          
          <div className="flex items-center gap-4 text-sm font-medium text-white/70">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              System Operational
            </div>
            <span>•</span>
            <div>Version 2.0.4</div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
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
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 mt-8">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-background"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground shadow-md transition-all hover:shadow-lg group" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm pt-6 border-t">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Request access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
