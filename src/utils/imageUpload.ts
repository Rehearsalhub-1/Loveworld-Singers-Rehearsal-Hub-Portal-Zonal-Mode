import { BackendAPI } from '@/lib/api-client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadProfileImage(
  file: File,
  _userId?: string
): Promise<UploadResult> {
  try {
    const valid = validateImageFile(file);
    if (!valid.valid) {
      return { success: false, error: valid.error };
    }

    const res: any = await BackendAPI.upload.file(file);
    const url = res?.url || res?.data?.url;
    if (!url) {
      return { success: false, error: 'Upload returned no URL' };
    }

    return { success: true, url };
  } catch (error: any) {
    console.error('Unexpected error during upload:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during upload.' };
  }
}

export async function deleteProfileImage(_imageUrl: string): Promise<boolean> {
  return true;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
    };
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image smaller than 5MB.'
    };
  }
  
  return { valid: true };
}

// Ultra-fast banner image upload function for admin pages
export async function uploadBannerImage(
  file: File,
  _pageId: number | string
): Promise<UploadResult> {
  try {
    const valid = validateImageFile(file);
    if (!valid.valid) {
      return { success: false, error: valid.error };
    }

    const res: any = await BackendAPI.upload.file(file);
    const url = res?.url || res?.data?.url;
    if (!url) {
      return { success: false, error: 'Upload failed' };
    }

    return { success: true, url };
  } catch (error: any) {
    console.error('Unexpected error during banner upload:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during upload.'
    };
  }
}

// Image compression function for faster uploads
async function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions (max 1920px width)
      const maxWidth = 1920;
      const maxHeight = 1080;
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
}
