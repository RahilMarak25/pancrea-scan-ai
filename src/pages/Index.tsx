import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FileUploadSection } from "@/components/FileUploadSection";
import { FeatureCards } from "@/components/FeatureCards";
import { Footer } from "@/components/Footer";
import { AnalysisHistory } from "@/components/AnalysisHistory";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6">
        <HeroSection />
        <FileUploadSection />
        <AnalysisHistory />
        <FeatureCards />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
