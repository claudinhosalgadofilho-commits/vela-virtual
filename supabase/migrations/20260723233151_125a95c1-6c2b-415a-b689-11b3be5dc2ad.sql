
-- Allow public read on tribute-photos bucket so visitors can view uploaded photos via signed URLs
CREATE POLICY "Public can read tribute photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'tribute-photos');
