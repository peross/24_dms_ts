import { FolderTree } from "@/components/FolderTree"
import { FileList } from "@/components/FileList"
import { useLayout } from "@/components/Layout"

export function Files() {
  const { viewMode } = useLayout()

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
      <FolderTree />
      <FileList viewMode={viewMode} />
    </div>
  )
}

