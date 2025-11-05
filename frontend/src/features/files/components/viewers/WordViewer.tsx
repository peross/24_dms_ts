import { useEffect, useState } from "react"
import mammoth from "mammoth"
import { Loader2 } from "lucide-react"

interface WordViewerProps {
  file: Blob
}

export function WordViewer({ file }: WordViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    file.arrayBuffer()
      .then((buffer) => {
        return mammoth.convertToHtml({ arrayBuffer: buffer })
      })
      .then((result) => {
        setHtmlContent(result.value)
        if (result.messages.length > 0) {
          console.warn("Word conversion warnings:", result.messages)
        }
      })
      .catch((err) => {
        console.error("Failed to convert Word document:", err)
        setError("Failed to load Word document")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [file])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-8 bg-background">
      <div
        className="max-w-4xl mx-auto prose prose-sm dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  )
}

