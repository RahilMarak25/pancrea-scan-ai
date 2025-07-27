import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Folder, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Types for ML prediction
interface PredictionResult {
  prediction: string;
  confidence: number;
  processed_files: number;
}

export const FileUploadSection = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    setResult(null);
    setConfidence(null);
    
    if (files && files.length > 0) {
      toast({
        title: "Files Selected",
        description: `${files.length} DICOM files selected for analysis`,
      });
    }
  };

  const analyzeWithMLModel = async (files: FileList): Promise<PredictionResult> => {
    const formData = new FormData();
    
    // Add all DICOM files to FormData
    Array.from(files).forEach((file, index) => {
      formData.append(`dicom_files`, file);
    });

    // Option 1: Call your Python ML API endpoint
    const response = await fetch('/api/analyze-dicom', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${user?.access_token}`, // If you need auth
      },
    });

    if (!response.ok) {
      throw new Error(`ML API error: ${response.statusText}`);
    }

    return await response.json();
  };

  const handleAnalyze = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select DICOM files before analysis",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze DICOM files",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Upload files to Supabase Storage for record keeping
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('dicom-files')
          .upload(fileName, file);
        
        if (error) throw error;
        return fileName;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Call your ML model for actual prediction
      const mlResult = await analyzeWithMLModel(selectedFiles);
      
      // Save analysis result to database
      const { error: dbError } = await supabase
        .from('analysis_results')
        .insert({
          user_id: user.id,
          file_count: selectedFiles.length,
          result: mlResult.prediction,
          confidence_score: mlResult.confidence,
          dicom_folder_path: `${user.id}/${Date.now()}`,
          processed_files: mlResult.processed_files,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Error saving results",
          description: "Analysis completed but couldn't save to history",
          variant: "destructive",
        });
      }

      setResult(mlResult.prediction);
      setConfidence(mlResult.confidence);
      
      toast({
        title: "Analysis Complete",
        description: `${mlResult.prediction} (${(mlResult.confidence * 100).toFixed(1)}% confidence)`,
        variant: mlResult.prediction.toLowerCase().includes("no tumor") ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-accent/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-semibold text-primary mb-6">
          Upload DICOM Folder for Analysis
        </h2>
        
        <div className="space-y-4">
          <input
            type="file"
            id="fileInput"
            accept=".dcm"
            {...({ webkitdirectory: "" } as any)}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="medical"
            size="lg"
            onClick={() => document.getElementById('fileInput')?.click()}
            className="text-lg px-8 py-3"
          >
            <Folder className="w-5 h-5" />
            Select DICOM Folder
          </Button>
          
          <Button
            variant="default"
            size="lg"
            onClick={handleAnalyze}
            disabled={!selectedFiles || isAnalyzing}
            className="text-lg px-8 py-3"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing with AI Model...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Analyze with AI Model
              </>
            )}
          </Button>
        </div>

        {selectedFiles && selectedFiles.length > 0 && (
          <div className="bg-muted rounded-lg p-4 max-h-32 overflow-y-auto">
            <p className="font-medium text-sm mb-2">Selected Files ({selectedFiles.length}):</p>
            <ul className="text-xs space-y-1 text-left">
              {Array.from(selectedFiles).slice(0, 10).map((file, index) => (
                <li key={index} className="truncate">
                  {file.webkitRelativePath || file.name}
                </li>
              ))}
              {selectedFiles.length > 10 && (
                <li className="text-muted-foreground">
                  ... and {selectedFiles.length - 10} more files
                </li>
              )}
            </ul>
          </div>
        )}

        {result && (
          <div className={`flex items-center justify-center gap-3 p-6 rounded-xl text-lg font-semibold ${
            result.toLowerCase().includes("no tumor") 
              ? "bg-success/10 text-success border-2 border-success/20" 
              : "bg-destructive/10 text-destructive border-2 border-destructive/20"
          }`}>
            {result.toLowerCase().includes("no tumor") ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
            <div className="text-center">
              <div>{result}</div>
              {confidence && (
                <div className="text-sm font-normal mt-1">
                  Confidence: {(confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
