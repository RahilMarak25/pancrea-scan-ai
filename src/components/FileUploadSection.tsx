import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Folder, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const FileUploadSection = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    setResult(null);
    
    if (files && files.length > 0) {
      toast({
        title: "Files Selected",
        description: `${files.length} DICOM files selected for analysis`,
      });
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
    
    try {
      // Upload files to Supabase Storage
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('dicom-files')
          .upload(fileName, file);
        
        if (error) throw error;
        return fileName;
      });

      await Promise.all(uploadPromises);

      // Simulate analysis (replace with actual API call to your ML backend)
      const mockResult = Math.random() > 0.5 ? "No Tumor Detected" : "Tumor Detected";
      const mockConfidence = Math.random() * 0.3 + 0.7; // Random confidence between 0.7-1.0
      
      // Save analysis result to database
      const { error: dbError } = await supabase
        .from('analysis_results')
        .insert({
          user_id: user.id,
          file_count: selectedFiles.length,
          result: mockResult,
          confidence_score: mockConfidence,
          dicom_folder_path: `${user.id}/${Date.now()}`,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Error saving results",
          description: "Analysis completed but couldn't save to history",
          variant: "destructive",
        });
      }

      setResult(mockResult);
      
      toast({
        title: "Analysis Complete",
        description: `${mockResult} (${(mockConfidence * 100).toFixed(1)}% confidence)`,
        variant: mockResult.includes("No") ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "An error occurred during analysis. Please try again.",
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
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Analyze DICOM Folder
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
            result.includes("No") 
              ? "bg-success/10 text-success border-2 border-success/20" 
              : "bg-destructive/10 text-destructive border-2 border-destructive/20"
          }`}>
            {result.includes("No") ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}
            <span>{result}</span>
          </div>
        )}
      </div>
    </div>
  );
};