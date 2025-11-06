import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { FolderTree } from "@/components/FolderTree"
import { FileList } from "@/components/FileList"
import { useLayout } from "@/components/Layout"

export function Files() {
  const { viewMode, setSelectedFolderId } = useLayout()
  const [searchParams] = useSearchParams()

  // Update selected folder based on URL query params
  useEffect(() => {
    const systemFolderId = searchParams.get('system_folder_id')
    const folderId = searchParams.get('folder_id')
    
    if (folderId) {
      // If folder_id is present, use it (it may also have system_folder_id)
      const id = parseInt(folderId, 10)
      if (!isNaN(id)) {
        setSelectedFolderId(id)
      }
    } else if (systemFolderId) {
      // If only system_folder_id is present, use it
      const id = parseInt(systemFolderId, 10)
      if (!isNaN(id) && [1, 2, 3].includes(id)) {
        setSelectedFolderId(id)
      }
    } else {
      // Default to My Folders (system folder ID: 2)
      setSelectedFolderId(2)
    }
  }, [searchParams, setSelectedFolderId])

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
      <FolderTree />
      <FileList viewMode={viewMode} />
    </div>
  )
}

