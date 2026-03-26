-- Create policy explicitly allowing admins to update and delete across profiles
CREATE POLICY "Admins can manage profiles" 
ON public.profiles 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));
