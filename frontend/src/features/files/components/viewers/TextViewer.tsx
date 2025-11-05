import { useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"

interface TextViewerProps {
  content: string
  onChange: (content: string) => void
}

export function TextViewer({ content, onChange }: TextViewerProps) {
  const [editorContent, setEditorContent] = useState(content)

  useEffect(() => {
    setEditorContent(content)
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setEditorContent(value)
    onChange(value)
  }

  return (
    <div className="flex flex-col h-full p-4">
      <Textarea
        value={editorContent}
        onChange={handleChange}
        className="flex-1 font-mono text-sm resize-none"
        placeholder="File content..."
      />
    </div>
  )
}

