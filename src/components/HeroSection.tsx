export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white shadow-2xl my-8">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10"></div>
      <div className="relative px-8 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Smart Pancreatic Analysis
        </h1>
        <p className="text-xl md:text-2xl opacity-95 max-w-2xl mx-auto leading-relaxed">
          Advanced AI detection with precision diagnostics
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span>99.8% Accuracy</span>
          </div>
          <div className="w-px h-4 bg-white/30"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
};