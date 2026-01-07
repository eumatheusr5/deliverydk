import { supabase } from './supabase'

export async function uploadImage(
  file: File,
  bucket: string = 'products',
  folder: string = ''
): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder ? folder + '/' : ''}${crypto.randomUUID()}.${fileExt}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return data.publicUrl
}

export async function deleteImage(
  imageUrl: string,
  bucket: string = 'products'
): Promise<void> {
  // Extrai o path do arquivo da URL
  const url = new URL(imageUrl)
  const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`)
  
  if (pathParts.length !== 2) return
  
  const filePath = pathParts[1]
  
  if (!filePath) return

  const { error } = await supabase.storage.from(bucket).remove([filePath])
  
  if (error) {
    console.error('Error deleting image:', error)
  }
}

