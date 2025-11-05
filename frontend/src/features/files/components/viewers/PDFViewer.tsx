import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface PDFViewerProps {
  file: Blob
}

export function PDFViewer({ file }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Create a blob URL for the PDF
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
    setLoading(false)

    // Cleanup: revoke the blob URL when component unmounts
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
        style={{ minHeight: '100%' }}
      />
    </div>
  )
}
