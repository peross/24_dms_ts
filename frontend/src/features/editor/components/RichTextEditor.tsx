import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

const MonacoEditor = lazy(async () => {
  const module = await import('@monaco-editor/react')
  return { default: module.default }
})

export interface RichTextEditorProps {
  readonly value: string
  readonly language?: string
  readonly onChange?: (value: string) => void
  readonly readOnly?: boolean
  readonly lineNumbers?: 'on' | 'off'
  readonly className?: string
}

export function RichTextEditor({
  value,
  language,
  onChange,
  readOnly = false,
  lineNumbers = 'on',
  className,
}: RichTextEditorProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const editorTheme = useMemo(() => (isDark ? 'vs-dark' : 'vs'), [isDark])

  return (
    <div className={className ? `h-full ${className}` : 'h-full'}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <MonacoEditor
          value={value}
          language={language}
          theme={editorTheme}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            scrollBeyondLastLine: false,
            lineNumbers,
            wordWrap: 'on',
            smoothScrolling: true,
            automaticLayout: true,
            renderWhitespace: 'selection',
            tabSize: 2,
          }}
          onChange={(val) => {
            if (!readOnly) {
              onChange?.(val ?? '')
            }
          }}
        />
      </Suspense>
    </div>
  )
}

