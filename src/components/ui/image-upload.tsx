import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadImage, deleteImage } from '@/lib/storage'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
  className?: string
}

export function ImageUpload({ value, onChange, folder = 'categories', className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem')
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Se já tem uma imagem, deletar a anterior
      if (value) {
        await deleteImage(value)
      }

      const url = await uploadImage(file, 'products', folder)
      onChange(url)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Erro ao enviar imagem. Tente novamente.')
    } finally {
      setIsUploading(false)
      // Limpar o input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  async function handleRemove() {
    if (!value) return

    setIsUploading(true)
    try {
      await deleteImage(value)
      onChange(null)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleUpload}
        className="hidden"
        disabled={isUploading}
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute top-2 right-2 p-1.5 bg-background/90 text-text-secondary hover:text-error rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <X size={16} />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg hover:border-text-secondary hover:bg-surface/50 transition-colors"
        >
          {isUploading ? (
            <Loader2 size={24} className="animate-spin text-text-secondary" />
          ) : (
            <>
              <Upload size={24} className="text-text-secondary" />
              <span className="text-sm text-text-secondary">Clique para enviar imagem</span>
              <span className="text-xs text-text-secondary/60">JPG, PNG, WebP ou GIF até 5MB</span>
            </>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  )
}

