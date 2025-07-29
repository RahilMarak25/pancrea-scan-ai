import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Folder, AlertCircle, CheckCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Types for ML prediction
interface PredictionResult {
  prediction: string;
  confidence: number;
  processed_files: number;
  total_files: number;
  processing_time: number;
  model_version: string;
}

interface AnalysisError {
  message: string;
  code?: string;
  details?: any;
}

export const FileUploadSection = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [processingDetails, setProcessingDetails] = useState<{
    processed: number;
    total: number;
    processingTime: number;
  } | null>(null);
  const { toast } = useToast();
  const { user, session } = useAuth();

  // API endpoint for your ML model
  const ML_API_BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    setResult(null);
    setConfidence(null);
    setProcessingDetails(null);
    
    if (files && files.length > 0) {
      // Validate DICOM files
      const dicomFiles = Array.from(files).filter(file => 
        file.name.toLowerCase().endsWith('.dcm') || 
        file.type === 'application/dicom'
      );
      
      if (dicomFiles.length === 0) {
        toast({
          title: "Invalid File Type",
          description: "Please select DICOM (.dcm) files only",
          variant: "destructive",
        });
        setSelectedFiles(null);
        return;
      }
      
      toast({
        title: "Files Selected",
        description: `${dicomFiles.length} DICOM files selected for analysis`,
      });
    }
  };

  const analyzeWithMLModel = async (files: FileList): Promise<PredictionResult> => {
    const formData = new FormData();
    
    // Add metadata
    formData.append('user_id', user?.id || '');
    formData.append('analysis_type', 'pancreatic_tumor_detection');
    
    // Add all DICOM files to FormData
    const dicomFiles = Array.from(files).filter(file => 
      file.name.toLowerCase().endsWith('.dcm') || 
      file.type === 'application/dicom'
    );
    
    dicomFiles.forEach((file, index) => {
      formData.append(`dicom_files`, file);
    });

    // Call your Python FastAPI/Flask endpoint
    const response = await fetch(`${ML_API_BASE_URL}/api/v1/analyze-dicom`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type header - let browser set it with boundary for FormData
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  };

  const uploadToSupabase = async (files: FileList): Promise<string[]> => {
    const uploadPromises = Array.from(files).map(async (file, index) => {
      const fileName = `${user?.id}/${Date.now()}-${index}-${file.name}`;
      const { error } = await supabase.storage
        .from('dicom-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error(`Error uploading ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }
      return fileName;
    });

    return await Promise.all(uploadPromises);
  };

  const saveAnalysisResult = async (
    mlResult: PredictionResult, 
    uploadedFiles: string[]
  ) => {
    const { error: dbError } = await supabase
      .from('analysis_results')
      .insert({
        user_id: user?.id,
        file_count: mlResult.total_files,
        processed_file_count: mlResult.processed_files,
        result: mlResult.prediction,
        confidence_score: mlResult.confidence,
        processing_time: mlResult.processing_time,
        model_version: mlResult.model_version,
        dicom_folder_path: `${user?.id}/${Date.now()}`,
        file_paths: uploadedFiles,
        created_at: new Date().toISOString(),
        metadata: {
          analysis_type: 'pancreatic_tumor_detection',
          api_version: 'v1'
        }
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save analysis results to database');
    }
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
    let uploadedFiles: string[] = [];
    
    try {
      // Step 1: Upload files to Supabase Storage for record keeping
      toast({
        title: "Uploading Files",
        description: "Uploading DICOM files to secure storage...",
      });
      
      uploadedFiles = await uploadToSupabase(selectedFiles);

      // Step 2: Analyze with ML model
      toast({
        title: "Analyzing with AI",
        description: "Processing images with our trained neural network...",
      });

      const mlResult = await analyzeWithMLModel(selectedFiles);
      
      // Step 3: Save results to database
      await saveAnalysisResult(mlResult, uploadedFiles);

      // Step 4: Update UI with results
      setResult(mlResult.prediction);
      setConfidence(mlResult.confidence);
      setProcessingDetails({
        processed: mlResult.processed_files,
        total: mlResult.total_files,
        processingTime: mlResult.processing_time
      });
      
      const isPositive = mlResult.prediction.toLowerCase().includes("tumor detected") || 
                        mlResult.prediction.toLowerCase().includes("positive");
      
      toast({
        title: "Analysis Complete",
        description: `${mlResult.prediction} (${(mlResult.confidence * 100).toFixed(1)}% confidence)`,
        variant: isPositive ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      
      // Clean up uploaded files on error
      if (uploadedFiles.length > 0) {
        try {
          await Promise.all(
            uploadedFiles.map(fileName => 
              supabase.storage.from('dicom-files').remove([fileName])
            )
          );
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred during analysis";
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-accent/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-semibold text-primary">
            AI-Powered Pancreatic Analysis
          </h2>
        </div>
        
        <div className="space-y-4">
          <input
            type="file"
            id="fileInput"
            accept=".dcm,application/dicom"
            {...({ webkitdirectory: "" } as any)}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            variant="medical"
            size="lg"
            onClick={() => document.getElementById('fileInput')?.click()}
            className="text-lg px-8 py-3 w-full sm:w-auto"
            disabled={isAnalyzing}
          >
            <Folder className="w-5 h-5" />
            Select DICOM Folder
          </Button>
          
          <Button
            variant="default"
            size="lg"
            onClick={handleAnalyze}
            disabled={!selectedFiles || isAnalyzing}
            className="text-lg px-8 py-3 w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing with CNN Model...
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
          <div className="bg-muted rounded-lg p-4 max-h-40 overflow-y-auto">
            <p className="font-medium text-sm mb-2">
              Selected Files ({selectedFiles.length}):
            </p>
            <ul className="text-xs space-y-1 text-left">
              {Array.from(selectedFiles).slice(0, 10).map((file, index) => (
                <li key={index} className="truncate flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                  {file.webkitRelativePath || file.name}
                  <span className="text-muted-foreground ml-auto">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </li>
              ))}
              {selectedFiles.length > 10 && (
                <li className="text-muted-foreground font-medium">
                  ... and {selectedFiles.length - 10} more files
                </li>
              )}
            </ul>
          </div>
        )}

        {result && (
          <div className={`p-6 rounded-xl border-2 space-y-3 ${
            result.toLowerCase().includes("no tumor") || result.toLowerCase().includes("negative")
              ? "bg-green-50 text-green-800 border-green-200" 
              : "bg-red-50 text-red-800 border-red-200"
          }`}>
            <div className="flex items-center justify-center gap-3">
              {result.toLowerCase().includes("no tumor") || result.toLowerCase().includes("negative") ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
              <span className="text-lg font-semibold">{result}</span>
            </div>
            
            {confidence && (
              <div className="text-sm space-y-1">
                <div className="font-medium">
                  Confidence: {(confidence * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-white/50 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${confidence * 100}%`,
                      backgroundColor: confidence > 0.8 ? '#22c55e' : confidence > 0.6 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
              </div>
            )}
            
            {processingDetails && (
              <div className="text-xs text-current/70 border-t border-current/20 pt-2 mt-2">
                <div>Processed: {processingDetails.processed}/{processingDetails.total} files</div>
                <div>Processing Time: {processingDetails.processingTime.toFixed(2)}s</div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Supported formats: DICOM (.dcm) files</p>
          <p>• No limit on number of files per analysis</p>
          <p>• All data is encrypted and HIPAA compliant</p>
        </div>
      </div>
    </div>
  );
};
