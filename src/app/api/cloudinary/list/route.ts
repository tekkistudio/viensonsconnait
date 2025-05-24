// src/app/api/cloudinary/list/route.ts
import { type NextRequest } from 'next/server';
import * as cloudinary from 'cloudinary';

// Configuration de Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resource_type = searchParams.get('resource_type') || 'image';
    const prefix = searchParams.get('prefix') || '';
    const max_results = parseInt(searchParams.get('max_results') || '50');
    const next_cursor = searchParams.get('next_cursor') || undefined;
    
    const result = await cloudinary.v2.api.resources({
      type: 'upload',
      prefix,
      max_results,
      next_cursor,
      resource_type,
      context: true,
      metadata: true,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Cloudinary list error:', error);
    return new Response('Error listing resources', { status: 500 });
  }
}

// src/app/api/cloudinary/delete/route.ts
export async function POST(request: NextRequest) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return new Response('Public ID is required', { status: 400 });
    }

    const result = await cloudinary.v2.uploader.destroy(publicId);
    return Response.json(result);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return new Response('Error deleting resource', { status: 500 });
  }
}