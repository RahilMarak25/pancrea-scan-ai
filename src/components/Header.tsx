import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, User } from "lucide-react";
import pancreaLogo from "@/assets/pancrea-logo.png";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      signOut();
    } else {
      navigate("/auth");
    }
  };

  return (
    <header className="bg-gradient-to-r from-primary to-primary-glow shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={pancreaLogo} 
              alt="Pancrea Safe Logo" 
              className="w-10 h-10 drop-shadow-lg"
            />
            <h1 className="text-white text-2xl font-bold tracking-tight">
              Pancrea Safe
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-white/90">
                <User className="w-4 h-4" />
                <span className="text-sm">{user.email}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAuthAction}
              className="text-white border-white/20 hover:bg-white/10"
            >
              {user ? (
                <>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};