import { useState } from "react"
import { FileGridView } from "./FileGridView"
import { FileListView } from "./FileListView"
import { files } from "@/data/files"

export type ViewMode = "grid" | "list"

interface FileListProps {
  viewMode: ViewMode
}

export function FileList({ viewMode }: FileListProps) {
  const [selected, setSelected] = useState<string | null>("testfile.txt")

  if (viewMode === "grid") {
    return (
      <FileGridView
        files={files}
        selected={selected}
        onSelect={setSelected}
      />
    )
  }

  return (
    <FileListView
      files={files}
      selected={selected}
      onSelect={setSelected}
    />
  )
}
