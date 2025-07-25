import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  id: string;
  file_count: number;
  result: string;
  confidence_score: number | null;
  analysis_date: string;
  created_at: string;
}

export const AnalysisHistory = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAnalysisHistory();
    }
  }, [user]);

  const fetchAnalysisHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('analysis_results')
        .select('*')
        .order('analysis_date', { ascending: false })
        .limit(10);

      if (error) {
        toast({
          title: "Error fetching history",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResults(data || []);
      }
    } catch (error) {
      console.error('Error fetching analysis history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="my-16">
        <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Analysis History</h2>
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <section className="my-16">
        <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Analysis History</h2>
        <Card className="text-center p-8">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No analysis results yet. Upload your first DICOM folder to get started!</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="my-16">
      <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Analysis History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => {
          const isNoTumor = result.result.toLowerCase().includes('no');
          const date = new Date(result.analysis_date).toLocaleDateString();
          const time = new Date(result.analysis_date).toLocaleTimeString();
          
          return (
            <Card key={result.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isNoTumor ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    Analysis Result
                  </CardTitle>
                  <Badge variant={isNoTumor ? "default" : "destructive"}>
                    {result.result}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{result.file_count} DICOM files</span>
                </div>
                {result.confidence_score && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Confidence: </span>
                    <span className="font-medium">{(result.confidence_score * 100).toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{date} at {time}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};