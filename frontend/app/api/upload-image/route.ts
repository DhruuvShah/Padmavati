import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error: authError } = await adminSupabase.auth.getUser(token);
  if (authError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: buckets } = await adminSupabase.storage.listBuckets();
  const bucket = buckets?.find(b => b.name === 'product-images');
  if (!bucket) {
    await adminSupabase.storage.createBucket('product-images', { public: true });
  } else if (!bucket.public) {
    await adminSupabase.storage.updateBucket('product-images', { public: true });
  }

  const { error } = await adminSupabase.storage
    .from('product-images')
    .upload(fileName, buffer, { contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = adminSupabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl, path: fileName });
}
