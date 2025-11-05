import { useState, useEffect } from "react"
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageViewerProps {
  file: Blob
  fileName?: string
}

export function ImageViewer({ file, fileName }: ImageViewerProps) {
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [imageUrl, setImageUrl] = useState<string>("")

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const zoomIn = () => {
    setScale((prev) => Math.min(4.0, prev + 0.2))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(0.2, prev - 0.2))
  }

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const reset = () => {
    setScale(1.0)
    setRotation(0)
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-muted/50 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotate} className="ml-2">
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={reset} className="ml-2">
            Reset
          </Button>
        </div>
      </div>

      {/* Image Content */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={fileName || "Preview"}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transition: "transform 0.2s",
          }}
        />
      </div>
    </div>
  )
}

