import { createContext, useContext, useState, ReactNode } from "react"

interface ClipboardItem {
  type: "file" | "folder"
  id: number
  name: string
  action: "copy" | "cut"
}

interface ClipboardContextType {
  clipboard: ClipboardItem[]
  copy: (items: Omit<ClipboardItem, "action">[]) => void
  cut: (items: Omit<ClipboardItem, "action">[]) => void
  clear: () => void
  canPaste: () => boolean
}

const ClipboardContext = createContext<ClipboardContextType | undefined>(undefined)

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([])

  const copy = (items: Omit<ClipboardItem, "action">[]) => {
    setClipboard(items.map(item => ({ ...item, action: "copy" })))
  }

  const cut = (items: Omit<ClipboardItem, "action">[]) => {
    setClipboard(items.map(item => ({ ...item, action: "cut" })))
  }

  const clear = () => {
    setClipboard([])
  }

  const canPaste = () => {
    return clipboard.length > 0
  }

  return (
    <ClipboardContext.Provider value={{ clipboard, copy, cut, clear, canPaste }}>
      {children}
    </ClipboardContext.Provider>
  )
}

export function useClipboard() {
  const context = useContext(ClipboardContext)
  if (!context) {
    throw new Error("useClipboard must be used within ClipboardProvider")
  }
  return context
}

