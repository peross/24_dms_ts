import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, History, Download, Clock } from "lucide-react"
import { useFileVersions } from "@/features/files/hooks/useFiles"
import { fileApi } from "@/lib/api/file.api"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/components/FileGridView"

interface VersionHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  if (locale === 'sr') {
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', '.')
  }
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionHistoryDialog({ open, onOpenChange, file }: VersionHistoryDialogProps) {
  const { t, i18n } = useTranslation()
  const { data: versionsData, isLoading, error } = useFileVersions(file?.id || 0)

  const handleDownloadVersion = async (fileId: number, version: number) => {
    try {
      const blob = await fileApi.downloadFile(fileId, version)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file?.name || `version-${version}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t('files.versionHistory')}
          </DialogTitle>
          <DialogDescription>
            {t('files.versionHistoryDescription', { name: file?.name })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">{t('files.failedToLoadVersions')}</p>
            </div>
          ) : !versionsData?.versions || versionsData.versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{t('files.noVersions')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versionsData.versions.map((version) => (
                <div
                  key={version.versionId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                      v{version.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {t('files.version')} {version.version}
                        </p>
                        {versionsData.versions && versionsData.versions.length > 0 && version.version === versionsData.versions[0].version && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {t('files.current')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.createdAt, i18n.language)}
                        </div>
                        <div>{formatFileSize(version.size)}</div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleDownloadVersion(version.fileId, version.version)}
                    title={t('files.downloadVersion')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

