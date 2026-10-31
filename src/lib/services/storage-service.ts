/**
 * ŞANTİYE GO – GERÇEK DOSYA VE GÖRSEL DEPOLAMA SERVİSİ
 * Prompt 8: Supabase Storage entegrasyonu, dosya boyutu ve MIME türü denetimi,
 * güvenli yükleme, silme ve URL çözümleme.
 */

import { createClient } from '@/lib/supabase/client';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * 1. İLAN FOTOĞRAFI YÜKLEME (Listing Photos)
 */
export async function uploadListingPhoto(file: File, listingId?: string): Promise<FileUploadResult> {
  // A. Tür Kontrolü
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      success: false,
      error: 'Geçersiz dosya formatı. Yalnızca JPEG, PNG veya WebP fotoğrafları yüklenebilir.',
    };
  }

  // B. Boyut Kontrolü (Max 5MB)
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: 'Dosya boyutu çok büyük. İlan fotoğrafları en fazla 5 MB olabilir.',
    };
  }

  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  // Benzersiz dosya yolu üretimi
  const cleanListingId = listingId ? listingId.replace(/[^a-zA-Z0-9_-]/g, '') : 'taslak';
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${cleanListingId}/${fileName}`;

  if (!isSupabaseConfigured) {
    // Yerel geliştirme önizlemesi (Object URL)
    const localPreviewUrl = URL.createObjectURL(file);
    return {
      success: true,
      url: localPreviewUrl,
      path: filePath,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from('listing-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { success: false, error: `Fotoğraf yüklenemedi: ${error.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
    };
  } catch (err: any) {
    return { success: false, error: `Yükleme hatası: ${err.message}` };
  }
}

/**
 * 2. İLAN FOTOĞRAFI SİLME
 */
export async function deleteListingPhoto(filePathOrUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!filePathOrUrl) return { success: false, error: 'Dosya yolu bulunamadı.' };

  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  // URL'den bucket içi dosya yolunu çıkar
  let path = filePathOrUrl;
  if (filePathOrUrl.includes('/listing-photos/')) {
    path = filePathOrUrl.split('/listing-photos/')[1];
  }

  try {
    const { error } = await supabase.storage.from('listing-photos').remove([path]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 3. FİRMA DOĞRULAMA BELGESİ YÜKLEME (Vergi Levhası / İmza Sirküleri / Faaliyet Belgesi)
 */
export async function uploadCompanyDocument(
  file: File,
  companyId: string,
  docType: 'tax_plate' | 'signature_circular' | 'operating_license'
): Promise<FileUploadResult> {
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return {
      success: false,
      error: 'Geçersiz belge formatı. Lütfen PDF veya JPG/PNG/WebP formatında bir dosya yükleyin.',
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      success: false,
      error: 'Belge boyutu 10 MB sınırını aşıyor.',
    };
  }

  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  const fileExt = file.name.split('.').pop() || 'pdf';
  const filePath = `${companyId}/${docType}-${Date.now()}.${fileExt}`;

  if (!isSupabaseConfigured) {
    return {
      success: true,
      url: URL.createObjectURL(file),
      path: filePath,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      return { success: false, error: `Belge yüklenemedi: ${error.message}` };
    }

    // Özel (private) bucket olduğu için signed URL veya storage path döndürülür
    return {
      success: true,
      path: data.path,
      url: data.path,
    };
  } catch (err: any) {
    return { success: false, error: `Belge yükleme hatası: ${err.message}` };
  }
}
