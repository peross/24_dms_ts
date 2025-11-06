import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { fileApi } from "@/lib/api/file.api"
import { PDFViewer } from "@/features/files/components/viewers/PDFViewer"
import { ExcelViewer } from "@/features/files/components/viewers/ExcelViewer"
import { WordViewer } from "@/features/files/components/viewers/WordViewer"
import { TextViewer } from "@/features/files/components/viewers/TextViewer"
import { ImageViewer } from "@/features/files/components/viewers/ImageViewer"
import { useLayout } from "@/components/Layout"
import { folderApi } from "@/lib/api/folder.api"
import { useUploadNewVersion } from "@/features/files/hooks/useFiles"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

function getFileType(mimeType?: string, fileName?: string): 'pdf' | 'excel' | 'word' | 'txt' | 'image' | 'unsupported' {
  if (!mimeType && !fileName) return 'unsupported'
  
  const mime = mimeType?.toLowerCase() || ''
  const name = fileName?.toLowerCase() || ''
  
  // PDF
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf'
  }
  
  // Images
  if (mime.startsWith('image/') || 
      name.endsWith('.jpg') || name.endsWith('.jpeg') || 
      name.endsWith('.png') || name.endsWith('.gif') ||
      name.endsWith('.bmp') || name.endsWith('.webp') ||
      name.endsWith('.svg') || name.endsWith('.ico')) {
    return 'image'
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

export function FileViewer() {
  const { t } = useTranslation()
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { setSelectedFolderPath, setSelectedFolderId, setTextFileSaveHandler } = useLayout()
  const uploadNewVersionMutation = useUploadNewVersion()
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [file, setFile] = useState<{ fileId: number; name: string; mimeType: string; folderId?: number } | null>(null)

  // Check if we're on a valid file viewer route
  const isValidRoute = fileId && location.pathname.startsWith('/files/view/')

  // Cleanup state when fileId changes or component unmounts
  useEffect(() => {
    return () => {
      // Clear all state when navigating away
      setFile(null)
      setFileBlob(null)
      setFileContent(null)
      setError(null)
      setLoading(false)
      setTextFileSaveHandler(null)
    }
  }, [fileId, setTextFileSaveHandler])

  // Fetch file info using API and update folder path
  useEffect(() => {
    if (!fileId || !isValidRoute) {
      // Clear state if not on valid route
      setFile(null)
      setFileBlob(null)
      setFileContent(null)
      setError(null)
      return
    }

    // Reset state when fileId changes
    setFile(null)
    setFileBlob(null)
    setFileContent(null)
    setError(null)

    fileApi.getFile(Number.parseInt(fileId, 10))
      .then(async (response) => {
        // Only update state if we're still on the same fileId (check if route changed)
        if (location.pathname === `/files/view/${fileId}`) {
          setFile(response.file)
          
          // If file has a folder, get the folder path and append file name
          if (response.file.folderId) {
            try {
              const folderData = await folderApi.getFolder(response.file.folderId)
              if (folderData.folder.path) {
                // Append file name to the path
                setSelectedFolderPath(`${folderData.folder.path} / ${response.file.name}`)
                setSelectedFolderId(response.file.folderId)
              } else {
                // Fallback: show folder name and file name if path not available
                setSelectedFolderPath(`/ ${folderData.folder.name} / ${response.file.name}`)
                setSelectedFolderId(response.file.folderId)
              }
            } catch (err) {
              console.error('Failed to load folder info:', err)
              // If folder not found or error, show root with file name
              setSelectedFolderPath(`/ ${response.file.name}`)
              setSelectedFolderId(null)
            }
          } else {
            // File is in root - show root with file name
            setSelectedFolderPath(`/ ${response.file.name}`)
            setSelectedFolderId(null)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load file info:', err)
        // Only set error if we're still on the same route
        if (location.pathname === `/files/view/${fileId}`) {
          setError(t('files.failedToLoadFile'))
        }
      })
  }, [fileId, isValidRoute, t, setSelectedFolderPath, setSelectedFolderId, location.pathname])

  const fileType = file ? getFileType(file.mimeType, file.name) : 'unsupported'

  useEffect(() => {
    if (!fileId || !file) return

    // Verify we're still on the correct route before loading
    const currentPath = `/files/view/${fileId}`
    if (location.pathname !== currentPath) return

    setLoading(true)
    setError(null)
    setFileBlob(null)
    setFileContent(null)

    fileApi.downloadFile(Number.parseInt(fileId, 10))
      .then((blob) => {
        // Only update state if we're still on the same route
        if (location.pathname === currentPath) {
          setFileBlob(blob)
          
          // For text files, read content for editing
          if (fileType === 'txt') {
            blob.text().then(text => {
              if (location.pathname === currentPath) {
                setFileContent(text)
              }
            })
          }
          // For images, we don't need to read content - ImageViewer handles it
        }
      })
      .catch((err) => {
        console.error('Failed to load file:', err)
        // Only set error if we're still on the same route
        if (location.pathname === currentPath) {
          setError(t('files.failedToLoadFile'))
        }
      })
      .finally(() => {
        // Only update loading state if we're still on the same route
        if (location.pathname === currentPath) {
          setLoading(false)
        }
      })
  }, [fileId, file, fileType, t, location.pathname])

  // Save handler for text files
  const handleSave = useCallback(async () => {
    if (!file || fileType !== 'txt' || fileContent === null || !fileId) return

    try {
      // Extract plain text from content
      const plainText = fileContent
      
      // Create a new file from the plain text content
      const blob = new Blob([plainText], { type: 'text/plain' })
      const fileObj = new File([blob], file.name, { type: 'text/plain' })
      
      // Upload as new version using the mutation hook
      await uploadNewVersionMutation.mutateAsync({
        fileId: Number.parseInt(fileId, 10),
        file: fileObj,
      })
      
      toast.success(t('files.fileSavedSuccessfully', { name: file.name }), {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      })
      
      // Refresh the file content
      const newBlob = await fileApi.downloadFile(Number.parseInt(fileId, 10))
      setFileBlob(newBlob)
      newBlob.text().then(text => setFileContent(text))
    } catch (err) {
      console.error('Failed to save file:', err)
      toast.error(t('files.failedToSaveFile'))
    }
  }, [file, fileType, fileContent, fileId, uploadNewVersionMutation, t])

  // Register/unregister save handler based on file type
  useEffect(() => {
    if (fileType === 'txt' && fileContent !== null && fileId) {
      setTextFileSaveHandler(() => handleSave)
    } else {
      setTextFileSaveHandler(null)
    }
    
    // Cleanup on unmount
    return () => {
      setTextFileSaveHandler(null)
    }
  }, [fileType, fileContent, fileId, handleSave, setTextFileSaveHandler])

  const handleBack = () => {
    navigate('/files')
  }

  // Return null if not on a valid file viewer route
  if (!isValidRoute) {
    return null
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{t('files.fileNotFound')}</p>
          <Button onClick={handleBack} variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header is shown in Layout component - it displays the path with file name */}
      
      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={handleBack} variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </div>
        ) : fileType === 'unsupported' ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{t('files.unsupportedFileType')}</p>
              <Button onClick={handleBack} variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          </div>
        ) : fileType === 'pdf' && fileBlob ? (
          <PDFViewer file={fileBlob} />
        ) : fileType === 'image' && fileBlob ? (
          <ImageViewer file={fileBlob} fileName={file?.name} />
        ) : fileType === 'excel' && fileBlob ? (
          <ExcelViewer file={fileBlob} />
        ) : fileType === 'word' && fileBlob ? (
          <WordViewer file={fileBlob} />
        ) : fileType === 'txt' && fileContent !== null ? (
          <TextViewer content={fileContent} onChange={setFileContent} />
        ) : null}
      </div>
    </div>
  )
}

