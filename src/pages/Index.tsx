import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FileUploadSection } from "@/components/FileUploadSection";
import { FeatureCards } from "@/components/FeatureCards";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6">
        <HeroSection />
        <FileUploadSection />
        <FeatureCards />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
