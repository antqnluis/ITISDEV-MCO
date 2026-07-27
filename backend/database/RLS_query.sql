ALTER TABLE public.wellness_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user (logged-in student) to read resources
CREATE POLICY "Allow authenticated users to read wellness knowledge" 
  ON public.wellness_knowledge_base 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Block all modifications except from database admins / service keys
CREATE POLICY "Restrict modifications to admins" 
  ON public.wellness_knowledge_base 
  FOR ALL 
  TO service_role 
  USING (true);
