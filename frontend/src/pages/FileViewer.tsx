import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { FolderTree } from "@/components/FolderTree"
import { Loader2, ArrowLeft } from "lucide-react"
import { fileApi } from "@/lib/api/file.api"
import { PDFViewer } from "@/features/files/components/viewers/PDFViewer"
import { ExcelViewer } from "@/features/files/components/viewers/ExcelViewer"
import { WordViewer } from "@/features/files/components/viewers/WordViewer"
import { TextViewer } from "@/features/files/components/viewers/TextViewer"
import { ImageViewer } from "@/features/files/components/viewers/ImageViewer"
import { useLayout } from "@/components/Layout"
import { folderApi } from "@/lib/api/folder.api"

function getFileType(mimeType?: string, fileName?: string): 'pdf' | 'excel' | 'word' | 'text' | 'image' | 'unsupported' {
  if (!mimeType && !fileName) return 'unsupported'
  
  const mime = mimeType?.toLowerCase() || ''
  const name = fileName?.toLowerCase() || ''
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : ''
  
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
  
  const textExtensions = new Set([
    'txt','text','md','markdown','json','log','xml','html','htm','css','scss','less','js','jsx','ts','tsx','mjs','cjs','yml','yaml','ini','conf','config','env','sh','bash','zsh','fish','bat','cmd','ps1','sql','csv','tsv','svg','java','kt','kts','go','rs','rb','php','py','c','h','hpp','hh','cpp','cc','m','mm','swift'
  ])

  const textMimeIndicators = ['text/', 'json', 'xml', 'javascript', 'yaml', 'yml', 'csv', 'log', 'shell', 'x-sh', 'script']

  const isTextLike =
    mime === 'application/json' ||
    mime === 'application/xml' ||
    mime === 'application/x-yaml' ||
    mime === 'application/javascript' ||
    mime === 'application/x-sh' ||
    mime === 'application/x-shellscript' ||
    mime === 'application/csv' ||
    textMimeIndicators.some((indicator) => mime.includes(indicator)) ||
    textExtensions.has(extension)

  if (isTextLike) {
    return 'text'
  }
  
  return 'unsupported'
}

function getEditorLanguage(fileName?: string, mimeType?: string): string | undefined {
  const name = fileName?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : ''

  const languageByExtension: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    markdown: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
    ini: 'ini',
    env: 'ini',
    conf: 'ini',
    config: 'ini',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    bat: 'bat',
    cmd: 'bat',
    ps1: 'powershell',
    sql: 'sql',
    csv: 'plaintext',
    tsv: 'plaintext',
    py: 'python',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    swift: 'swift',
    c: 'c',
    h: 'c',
    hh: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    m: 'objective-c',
    mm: 'objective-c',
    lua: 'lua',
    rsx: 'rust',
    txt: 'plaintext',
    text: 'plaintext',
    log: 'plaintext',
  }

  if (languageByExtension[extension]) {
    return languageByExtension[extension]
  }

  if (mime.includes('json')) return 'json'
  if (mime.includes('xml')) return 'xml'
  if (mime.includes('yaml') || mime.includes('yml')) return 'yaml'
  if (mime.includes('javascript')) return 'javascript'
  if (mime.includes('typescript')) return 'typescript'
  if (mime.includes('markdown')) return 'markdown'
  if (mime.includes('csv') || mime.includes('tsv')) return 'plaintext'
  if (mime.includes('shell') || mime.includes('x-sh')) return 'shell'

  return 'plaintext'
}

function resolveContextFolderId(file: { folderId?: number }, folderIdParam: string | null, systemFolderIdParam: string | null): number | undefined {
  if (folderIdParam) {
    return Number.parseInt(folderIdParam, 10)
  }
  if (systemFolderIdParam) {
    return Number.parseInt(systemFolderIdParam, 10)
  }
  return file.folderId
}

function handleSystemFolder(
  folderId: number,
  fileName: string,
  setSelectedFolderPath: (path: string) => void,
  setSelectedFolderId: (folderId: number | null) => void,
): boolean {
  if (![1, 2, 3].includes(folderId)) {
    return false
  }

  const systemFolderNames: Record<number, string> = {
    1: 'General',
    2: 'My Folders',
    3: 'Shared With Me',
  }
  setSelectedFolderPath(`/ ${systemFolderNames[folderId]} / ${fileName}`)
  setSelectedFolderId(folderId)
  return true
}

async function handleRegularFolder(
  folderId: number,
  fileName: string,
  fallbackFolderId: number | undefined,
  setSelectedFolderPath: (path: string) => void,
  setSelectedFolderId: (folderId: number | null) => void,
): Promise<boolean> {
  try {
    const folderData = await folderApi.getFolder(folderId)
    if (folderData.folder.path) {
      setSelectedFolderPath(`${folderData.folder.path} / ${fileName}`)
    } else {
      setSelectedFolderPath(`/ ${folderData.folder.name} / ${fileName}`)
    }
    setSelectedFolderId(folderId)
    return true
  } catch (error) {
    console.error('Failed to load folder info:', error)
    if (fallbackFolderId) {
      setSelectedFolderId(fallbackFolderId)
    }
    return false
  }
}

async function applyFolderContext({
  file,
  folderIdParam,
  systemFolderIdParam,
  setSelectedFolderPath,
  setSelectedFolderId,
}: {
  file: { name: string; folderId?: number }
  folderIdParam: string | null
  systemFolderIdParam: string | null
  setSelectedFolderPath: (path: string) => void
  setSelectedFolderId: (folderId: number | null) => void
}) {
  const resolvedId = resolveContextFolderId(file, folderIdParam, systemFolderIdParam)

  if (resolvedId !== undefined) {
    if (handleSystemFolder(resolvedId, file.name, setSelectedFolderPath, setSelectedFolderId)) {
      return
    }

    const handled = await handleRegularFolder(resolvedId, file.name, file.folderId, setSelectedFolderPath, setSelectedFolderId)
    if (handled) {
      return
    }
  }

  if (file.folderId && resolvedId !== file.folderId) {
    const handled = await handleRegularFolder(file.folderId, file.name, file.folderId, setSelectedFolderPath, setSelectedFolderId)
    if (handled) {
      return
    }
  }

  setSelectedFolderPath(`/ ${file.name}`)
  setSelectedFolderId(null)
}

function parseFileIdParam(fileId: string | undefined): number | null {
  if (!fileId) return null
  const parsed = Number.parseInt(fileId, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function FileViewer() {
  const { t } = useTranslation()
  const { fileId } = useParams<{ fileId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const rawFileId = parseFileIdParam(fileId)
  const [searchParams] = useSearchParams()
  const searchParamsString = searchParams.toString()
  const { setSelectedFolderPath, setSelectedFolderId } = useLayout()
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [file, setFile] = useState<{ fileId: number; name: string; mimeType: string; folderId?: number } | null>(null)
  const [forceTextPreview, setForceTextPreview] = useState(false)
  const [textPreviewLoading, setTextPreviewLoading] = useState(false)
  const [textLoadError, setTextLoadError] = useState<string | null>(null)
  const latestDownloadRef = useRef<number>(0)

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
      setForceTextPreview(false)
      setTextPreviewLoading(false)
      setTextLoadError(null)
    }
  }, [fileId])

  // Fetch file info using API and update folder path
  useEffect(() => {
    if (rawFileId === null || !isValidRoute) {
      setFile(null)
      setFileBlob(null)
      setFileContent(null)
      setError(null)
      setForceTextPreview(false)
      setTextPreviewLoading(false)
      setTextLoadError(null)
      return
    }

    setFile(null)
    setFileBlob(null)
    setFileContent(null)

    const params = new URLSearchParams(searchParamsString)
    const folderId = params.get('folder_id')
    const systemFolderId = params.get('system_folder_id')

    fileApi.getFile(rawFileId)
      .then(async (response) => {
        if (!isValidRoute || response.file.fileId !== rawFileId) {
          return
        }

        setFile(response.file)

        await applyFolderContext({
          file: response.file,
          folderIdParam: folderId,
          systemFolderIdParam: systemFolderId,
          setSelectedFolderPath,
          setSelectedFolderId,
        })
      })
      .catch((err) => {
        console.error('Failed to load file info:', err)
        if (isValidRoute) {
          setError(t('files.failedToLoadFile'))
        }
      })
  }, [rawFileId, isValidRoute, t, setSelectedFolderPath, setSelectedFolderId, searchParamsString])

  const fileType = file ? getFileType(file.mimeType, file.name) : 'unsupported'
  const editorLanguage = useMemo(() => getEditorLanguage(file?.name, file?.mimeType), [file])
  const isTextFile = fileType === 'text'
  const canForceTextPreview = !isTextFile && Boolean(fileBlob)
  const shouldLoadTextContent = isTextFile || forceTextPreview

  useEffect(() => {
    if (rawFileId === null || !file) return

    const currentPath = `/files/view/${rawFileId}`
    if (location.pathname !== currentPath) return

    const requestId = Date.now()
    latestDownloadRef.current = requestId
    setLoading(true)
    setError(null)
    setFileBlob(null)
    setFileContent(null)

    fileApi.downloadFile(rawFileId)
      .then((blob) => {
        if (location.pathname === currentPath && requestId === latestDownloadRef.current) {
          setFileBlob(blob)
        }
      })
      .catch((err) => {
        console.error('Failed to load file:', err)
        if (location.pathname === currentPath && requestId === latestDownloadRef.current) {
          setError(t('files.failedToLoadFile'))
        }
      })
      .finally(() => {
        if (location.pathname === currentPath && requestId === latestDownloadRef.current) {
          setLoading(false)
        }
      })

    return () => {
      if (latestDownloadRef.current === requestId) {
        latestDownloadRef.current = 0
      }
    }
  }, [rawFileId, file, fileType, t, location.pathname])

  useEffect(() => {
    if (!fileBlob) {
      if (!isTextFile) {
        setFileContent(null)
      }
      setTextPreviewLoading(false)
      return
    }

    if (!shouldLoadTextContent) {
      if (!isTextFile) {
        setFileContent(null)
      }
      setTextPreviewLoading(false)
      setTextLoadError(null)
      return
    }

    let disposed = false
    const TEXT_WARNING_LIMIT = 5 * 1024 * 1024
    const isLarge = fileBlob.size > TEXT_WARNING_LIMIT
    setTextPreviewLoading(true)
    setTextLoadError(isLarge ? t('files.textPreviewLargeWarning') : null)

    fileBlob
      .text()
      .then((text) => {
        if (disposed) return
        setFileContent(text)
        setTextPreviewLoading(false)
      })
      .catch((err) => {
        if (disposed) return
        console.error('Failed to load text preview:', err)
        setTextPreviewLoading(false)
        setTextLoadError(t('files.failedToLoadTextPreview'))
      })

    return () => {
      disposed = true
    }
  }, [fileBlob, shouldLoadTextContent, isTextFile, t])

  useEffect(() => {
    if (isTextFile && forceTextPreview) {
      setForceTextPreview(false)
    }
  }, [isTextFile, forceTextPreview])

  const handleBack = () => {
    // Navigate back to the folder context from URL params
    const folderId = searchParams.get('folder_id')
    const systemFolderId = searchParams.get('system_folder_id')
    
    const params = new URLSearchParams()
    if (folderId) {
      params.set('folder_id', folderId)
    } else if (systemFolderId) {
      params.set('system_folder_id', systemFolderId)
    } else {
      // Default to My Folders
      params.set('system_folder_id', '2')
    }
    
    navigate(`/files?${params.toString()}`)
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

  const toolbarVisible = forceTextPreview || canForceTextPreview

  let viewerNode: ReactNode = null

  if (loading) {
    viewerNode = (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  } else if (error) {
    viewerNode = (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={handleBack} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  } else if (shouldLoadTextContent) {
    viewerNode = (
      <div className="flex h-full flex-col">
        {textLoadError && (
          <div className="border-b border-border bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
            {textLoadError}
          </div>
        )}
        {textPreviewLoading || fileContent === null ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{t('files.textPreviewLoading')}</span>
            </div>
          </div>
        ) : (
          <TextViewer
            content={fileContent}
            onChange={undefined}
            language={editorLanguage}
            readOnly
          />
        )}
      </div>
    )
  } else if (fileType === 'pdf' && fileBlob) {
    viewerNode = <PDFViewer file={fileBlob} />
  } else if (fileType === 'image' && fileBlob) {
    viewerNode = <ImageViewer file={fileBlob} fileName={file?.name} />
  } else if (fileType === 'excel' && fileBlob) {
    viewerNode = <ExcelViewer file={fileBlob} />
  } else if (fileType === 'word' && fileBlob) {
    viewerNode = <WordViewer file={fileBlob} />
  } else if (fileType === 'unsupported') {
    viewerNode = (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{t('files.unsupportedFileType')}</p>
          <Button onClick={handleBack} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden">
      <div className="border-b border-border bg-muted/40 lg:h-full lg:w-72 lg:flex-shrink-0 lg:border-b-0 lg:border-r dark:bg-muted/20">
        <div className="h-64 overflow-y-auto lg:h-full">
          <FolderTree />
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          {toolbarVisible && (
            <div className="flex items-center justify-end gap-2 border-b border-border bg-muted/40 px-4 py-2">
              {forceTextPreview ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setForceTextPreview(false)
                    setTextLoadError(null)
                  }}
                >
                  {t('files.exitTextPreview')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTextLoadError(null)
                    setForceTextPreview(true)
                  }}
                  disabled={!fileBlob || loading}
                >
                  {t('files.viewAsText')}
                </Button>
              )}
            </div>
          )}
          {viewerNode}
        </div>
      </div>
    </div>
  )
}

