import { useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Upload, Loader2, X, CheckCircle2 } from "lucide-react"
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
import { useUploadNewVersion } from "@/features/files/hooks/useFiles"
import type { FileItem } from "@/components/FileGridView"

interface UploadNewVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
}

export function UploadNewVersionDialog({ open, onOpenChange, file }: UploadNewVersionDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState("")

  const uploadMutation = useUploadNewVersion()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError("")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !file) {
      setError(t('files.selectFileRequired'))
      return
    }

    setError("")

    // Upload as new version using the file ID
    uploadMutation.mutate(
      {
        fileId: file.id,
        file: selectedFile,
      },
      {
        onSuccess: () => {
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
          toast.success(t('files.versionUploadedSuccessfully', { name: file?.name }), {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          })
          onOpenChange(false)
        },
        onError: (error: any) => {
          const errorMessage = error.response?.data?.error || error.message || t('files.uploadError')
          if (error.response?.status === 413 || errorMessage.toLowerCase().includes('too large')) {
            setError(t('files.fileTooLarge'))
          } else {
            setError(errorMessage)
          }
        },
      }
    )
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFile(null)
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
            {t('files.uploadNewVersion')}
          </DialogTitle>
          <DialogDescription>
            {t('files.uploadNewVersionDescription', { name: file?.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="file-upload-version" className="text-sm font-medium">
              {t('files.selectFile')}
            </label>
            <Input
              id="file-upload-version"
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
              className="cursor-pointer"
            />
            {selectedFile && (
              <div className="flex items-start justify-between p-3 bg-accent rounded-md gap-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p 
                    className="text-sm font-medium break-words overflow-wrap-anywhere"
                    title={selectedFile.name}
                    style={{ wordBreak: 'break-word' }}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 flex-shrink-0"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  disabled={uploadMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
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
            disabled={uploadMutation.isPending || !selectedFile}
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

