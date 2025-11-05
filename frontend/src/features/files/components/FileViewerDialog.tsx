import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X, Save, Download, CheckCircle2 } from "lucide-react"
import { fileApi } from "@/lib/api/file.api"
import type { FileItem } from "@/components/FileGridView"
import { PDFViewer } from "./viewers/PDFViewer"
import { ExcelViewer } from "./viewers/ExcelViewer"
import { WordViewer } from "./viewers/WordViewer"
import { TextViewer } from "./viewers/TextViewer"
import { toast } from "sonner"

interface FileViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  fileMimeType?: string
}

function getFileType(mimeType?: string, fileName?: string): 'pdf' | 'excel' | 'word' | 'txt' | 'unsupported' {
  if (!mimeType && !fileName) return 'unsupported'
  
  const mime = mimeType?.toLowerCase() || ''
  const name = fileName?.toLowerCase() || ''
  
  // PDF
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf'
  }
  
  // Excel
  if (mime.includes('excel') || mime.includes('spreadsheet') || 
      mime.includes('xlsx') || mime.includes('xls') ||
      name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return 'excel'
  }
  
  // Word
  if (mime.includes('word') || mime.includes('msword') || 
      mime.includes('docx') || mime.includes('doc') ||
      name.endsWith('.docx') || name.endsWith('.doc')) {
    return 'word'
  }
  
  // Text
  if (mime.includes('text/plain') || mime.includes('text/') ||
      name.endsWith('.txt') || name.endsWith('.text')) {
    return 'txt'
  }
  
  return 'unsupported'
}

export function FileViewerDialog({ open, onOpenChange, file, fileMimeType }: FileViewerDialogProps) {
  const { t } = useTranslation()
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null) // For text files editing

  const fileType = file ? getFileType(fileMimeType, file.name) : 'unsupported'

  useEffect(() => {
    if (open && file && file.type === 'file') {
      setLoading(true)
      setError(null)
      setFileBlob(null)
      setFileContent(null)

      fileApi.downloadFile(file.id)
        .then((blob) => {
          setFileBlob(blob)
          
          // For text files, read content for editing
          if (fileType === 'txt') {
            blob.text().then(text => setFileContent(text))
          }
        })
        .catch((err) => {
          console.error('Failed to load file:', err)
          setError(t('files.failedToLoadFile'))
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (!open) {
      // Reset state when dialog closes
      setFileBlob(null)
      setFileContent(null)
      setError(null)
    }
  }, [open, file, fileType, t])

  const handleSave = async () => {
    if (!file || fileType !== 'txt' || fileContent === null) return

    try {
      // Extract plain text from HTML content (ReactQuill returns HTML)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = fileContent
      const plainText = tempDiv.textContent || tempDiv.innerText || fileContent
      
      // Create a new file from the plain text content
      const blob = new Blob([plainText], { type: 'text/plain' })
      const fileObj = new File([blob], file.name, { type: 'text/plain' })
      
      // Upload as new version
      await fileApi.uploadNewVersion(file.id, fileObj)
      toast.success(t('files.fileSavedSuccessfully', { name: file.name }), {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save file:', err)
      toast.error(t('files.failedToSaveFile'))
    }
  }

  const handleDownload = async () => {
    if (!file || !fileBlob) return

    try {
      const url = window.URL.createObjectURL(fileBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex-1 truncate">{file.name}</DialogTitle>
            <div className="flex items-center gap-2">
              {fileType === 'txt' && fileContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('files.save')}
                </Button>
              )}
              {fileBlob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('files.download')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          ) : fileType === 'unsupported' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('files.unsupportedFileType')}</p>
              </div>
            </div>
          ) : fileType === 'pdf' && fileBlob ? (
            <PDFViewer file={fileBlob} />
          ) : fileType === 'excel' && fileBlob ? (
            <ExcelViewer file={fileBlob} />
          ) : fileType === 'word' && fileBlob ? (
            <WordViewer file={fileBlob} />
          ) : fileType === 'txt' && fileContent !== null ? (
            <TextViewer content={fileContent} onChange={setFileContent} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

