
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const supabaseUrl = 'https://fcjrvwqxcpphxgfhssov.supabase.co';
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('SUPABASE_SECRET_KEY is missing from .env.local');
    }

    const supabase = createClient(supabaseUrl, secretKey);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json(
        { error: 'No image uploaded' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: 'Please upload a JPG, PNG or WEBP image.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'Image must be smaller than 5MB.' },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;

    const { error } = await supabase.storage
      .from('pharmacy-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('pharmacy-photos')
      .getPublicUrl(fileName);

    return Response.json({ url: data.publicUrl });

  } catch (error) {
    console.error('Photo upload error:', error);

    return Response.json(
      { error: error.message || 'Photo upload failed' },
      { status: 500 }
    );
  }
}
