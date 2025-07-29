import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the ML API URL from environment variables
    const ML_API_URL = Deno.env.get('ML_API_URL') || 'http://localhost:8000';
    
    if (req.method === 'POST') {
      // Forward the request to your Flask API
      const formData = await req.formData();
      
      const response = await fetch(`${ML_API_URL}/api/v1/analyze-dicom`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header for FormData
      });

      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });
    }

    // Health check
    if (req.method === 'GET') {
      const response = await fetch(`${ML_API_URL}/health`);
      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in ml-proxy function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to connect to ML service',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});