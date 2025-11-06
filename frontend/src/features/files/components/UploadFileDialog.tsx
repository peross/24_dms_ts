import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { translateError } from "@/lib/utils/error-translator"
import { useMutation } from "@tanstack/react-query"
import { Upload, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useUploadFile } from "@/features/files/hooks/useFiles"
import { useLayout } from "@/components/Layout"

interface UploadFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId?: number | null
}

export function UploadFileDialog({ open, onOpenChange, folderId }: UploadFileDialogProps) {
  const { t } = useTranslation()
  const { selectedFolderId } = useLayout()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState("")

  // Use folderId prop if provided, otherwise use selected folder from context
  const targetFolderId = folderId !== undefined ? folderId : selectedFolderId

  const uploadMutation = useUploadFile()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(files)
      setError("")
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError(t('files.selectFileRequired'))
      return
    }

    setError("")

    uploadMutation.mutate(
      {
        files: selectedFiles,
        folderId: targetFolderId || undefined,
      },
      {
        onSuccess: () => {
          setSelectedFiles([])
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          onOpenChange(false)
        },
        onError: (error: any) => {
          // Extract error code and message from response
          const errorCode = error.response?.data?.errorCode
          const errorMessage = error.response?.data?.error || error.message || t('files.uploadError')
          
          // Check if it's a file size error
          if (error.response?.status === 413 || errorMessage.toLowerCase().includes('too large')) {
            setError(t('files.fileTooLarge'))
          } else {
            // Use translation utility if error code is available
            setError(translateError(errorCode, errorMessage, t))
          }
        },
      }
    )
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFiles([])
      setError("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
    onOpenChange(newOpen)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('files.uploadFile')}
          </DialogTitle>
          <DialogDescription>
            {t('files.uploadFileDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="file-upload" className="text-sm font-medium">
              {t('files.selectFiles')}
            </label>
            <Input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
              className="cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-accent rounded-md gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <p 
                        className="text-sm font-medium break-words overflow-wrap-anywhere" 
                        title={file.name}
                        style={{ wordBreak: 'break-word' }}
                      >
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 flex-shrink-0"
                      onClick={() => handleRemoveFile(index)}
                      disabled={uploadMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploadMutation.isPending || selectedFiles.length === 0}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('files.uploading')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('files.upload')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

