-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create analysis results table
CREATE TABLE public.analysis_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_count INTEGER NOT NULL,
  result TEXT NOT NULL,
  confidence_score DECIMAL(5,4),
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dicom_folder_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analysis results
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies for analysis results
CREATE POLICY "Users can view their own analysis results" 
ON public.analysis_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis results" 
ON public.analysis_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for DICOM files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dicom-files', 'dicom-files', false);

-- Create storage policies for DICOM files
CREATE POLICY "Users can upload their own DICOM files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'dicom-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own DICOM files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'dicom-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();