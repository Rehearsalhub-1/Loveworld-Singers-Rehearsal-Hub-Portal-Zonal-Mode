import { BackendAPI } from '@/lib/api-client';

export interface UltraFastUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  uploadTime?: number;
}

export interface UploadProgress {
  stage: 'compressing' | 'uploading' | 'processing' | 'complete';
  progress: number;
  message: string;
}

// Ultra-fast image compression using Canvas API with instant processing
function compressImage(file: File, quality: number = 0.85, maxWidth: number = 1000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            URL.revokeObjectURL(img.src);
            resolve(blob);
          } else {
            reject(new Error('Compression failed'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image load failed'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function generateOptimizedFilename(userId: string, originalFile: File): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${userId}-${timestamp}-${randomId}.webp`;
}

export async function ultraFastUploadProfileImage(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UltraFastUploadResult> {
  const startTime = Date.now();
  
  try {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
      };
    }
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size too large. Please upload an image smaller than 10MB.'
      };
    }
    
    let processedFile: Blob = file;
    if (file.size > 1 * 1024 * 1024) {
      onProgress?.({
        stage: 'compressing',
        progress: 30,
        message: 'Optimizing...'
      });

      processedFile = await compressImage(file, 0.85, 1000);
    }
    
    const fileName = generateOptimizedFilename(userId, file);
    
    onProgress?.({
      stage: 'uploading',
      progress: 60,
      message: 'Uploading to cloud...'
    });

    const fileToUpload = processedFile instanceof File
      ? processedFile
      : new File([processedFile], fileName, { type: 'image/webp' });

    const res: any = await BackendAPI.upload.file(fileToUpload);
    const publicUrl = res?.url || res?.data?.url;

    if (!publicUrl) {
      return {
        success: false,
        error: 'Upload failed'
      };
    }
    
    const uploadTime = Date.now() - startTime;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload complete!'
    });
    
    return {
      success: true,
      url: publicUrl,
      uploadTime
    };
    
  } catch (error: any) {
    console.error('Unexpected error during ultra-fast upload:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during upload.'
    };
  }
}

export async function batchUploadImages(
  files: File[],
  userId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UltraFastUploadResult[]> {
  const uploadPromises = files.map(async (file, index) => {
    return ultraFastUploadProfileImage(file, userId, (progress) => {
      onProgress?.(index, progress);
    });
  });
  
  return Promise.all(uploadPromises);
}

export function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to preload image'));
    img.src = url;
  });
}

export async function ultraFastDeleteImage(_imageUrl: string): Promise<boolean> {
  return true;
}
