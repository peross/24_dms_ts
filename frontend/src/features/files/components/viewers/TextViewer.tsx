import { useEffect, useState } from "react"
import { RichTextEditor } from "@/features/editor/components/RichTextEditor"

interface TextViewerProps {
  readonly content: string
  readonly onChange?: (content: string) => void
  readonly language?: string
  readonly readOnly?: boolean
}

export function TextViewer({ content, onChange, language, readOnly = false }: TextViewerProps) {
  const [editorContent, setEditorContent] = useState(content)

  useEffect(() => {
    setEditorContent(content)
  }, [content])

  const handleChange = (value: string) => {
    setEditorContent(value)
    onChange?.(value)
  }

  return (
    <div className="flex h-full flex-col">
      <RichTextEditor
        value={editorContent}
        language={language}
        onChange={handleChange}
        readOnly={readOnly || !onChange}
      />
    </div>
  )
}

