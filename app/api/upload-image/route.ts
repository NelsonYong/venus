import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ALLOWED_FILE_TYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 文本
  'text/plain',
  'text/csv',
  'text/markdown',
  // 代码
  'application/json',
  'application/javascript',
  'text/html',
  'text/css',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Limit to maximum number of files
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    const uploadPromises = files.map(async (file) => {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed for ${file.name}`);
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      // Upload to Vercel Blob
      const blob = await put(
        `uploads/${Date.now()}-${file.name}`,
        file,
        {
          access: 'public',
          addRandomSuffix: true,
        }
      );

      return {
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
        contentType: file.type,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload files' },
      { status: 500 }
    );
  }
}

