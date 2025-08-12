import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Settings, LogOut, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

export function Layout({
  children,
  showHeader = true,
  showFooter = true,
  className
}: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const [showTexture, setShowTexture] = useState(false);

  // Fetch user's texture preference
  useEffect(() => {
    const fetchTexturePreference = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('texture_preference')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully
        
        if (error) throw error;
        
        // Handle the case where profile exists
        if (data) {
          setShowTexture(data.texture_preference ?? false);
        } else {
          // Profile doesn't exist yet - use default value and don't log error
          setShowTexture(false);
        }
      } catch (error) {
        console.error('Error fetching texture preference:', error);
        // Fallback to default value even on error
        setShowTexture(false);
      }
    };

    fetchTexturePreference();
  }, [user]);
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out.",
        variant: "destructive"
      });
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '';
    const firstName = user.user_metadata?.firstName || '';
    const lastName = user.user_metadata?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Determine the link destination based on user authentication status
  const logoLinkDestination = user ? '/dashboard' : '/assets';

  return (
    <div className={cn(
      "flex flex-col min-h-screen font-sans",
      showTexture 
        ? "bg-gradient-to-b from-marble to-marble-dark dark:from-charcoal dark:to-charcoal-dark bg-[url('/texture.png')] bg-repeat dark:bg-[url('/texture-dark.png')]" 
        : "bg-gradient-to-b from-marble to-marble-dark dark:from-charcoal dark:to-charcoal-dark",
      className
    )}>
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 w-full py-3 px-4 sm:py-4 sm:px-8 flex items-center justify-between border-b border-border backdrop-blur-sm z-10">
          <Link to={logoLinkDestination} className="flex items-center space-x-2 sm:space-x-3 transition-all hover:opacity-80">
            <img src="/logo-futurecast.png" alt="FutureCast Logo" className="h-8 sm:h-10 w-auto" />
            <span className="font-black text-lg sm:text-2xl tracking-tight text-foreground">FUTURECAST<span className="text-accent font-black">AI</span></span>
          </Link>
          
          {!isAuthPage && user && (
            <nav className="hidden md:flex items-center space-x-8">
              {/* Navigation links can be added here */}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="flex items-center space-x-1 text-sm font-medium text-gold hover:text-gold-dark dark:hover:text-gold-light transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>
          )}

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            
            {isAuthPage ? (
              <Link to={location.pathname === '/login' ? '/signup' : '/login'} className="text-xs sm:text-sm font-medium text-gold hover:text-gold-dark dark:hover:text-gold-light transition-colors">
                {location.pathname === '/login' ? 'Create Account' : 'Sign In'}
              </Link>
            ) : user ? (
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-marble-dark dark:bg-gold/20 flex items-center justify-center text-xs font-medium text-charcoal dark:text-gold-light cursor-pointer hover:bg-gold/10 dark:hover:bg-gold/30 transition-colors">
                      {getUserInitials()}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="bg-white dark:bg-charcoal border-gold/10 dark:border-gold/20">
                    {isAdmin && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link to="/signup" className="text-xs sm:text-sm font-medium text-gold hover:text-gold-dark dark:hover:text-gold-light transition-colors">
                Sign Up
              </Link>
            )}
          </div>
        </header>
      )}

      <main className={cn("flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8", showHeader && "pt-20 sm:pt-24", className)}>
        <div className="w-full animate-fade-in">
          {children}
        </div>
      </main>

      {showFooter && (
        <footer className="w-full py-6 px-4 sm:py-8 sm:px-8 border-t border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} Future Cast. All rights reserved.
            </div>
            <div className="flex space-x-6 sm:space-x-8 mt-4 md:mt-0">
              <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
