import pancreaLogo from "@/assets/pancrea-logo.png";

export const Header = () => {
  return (
    <header className="bg-gradient-to-r from-primary to-primary-glow shadow-lg">
      <div className="container mx-auto px-6 py-4">
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
      </div>
    </header>
  );
};