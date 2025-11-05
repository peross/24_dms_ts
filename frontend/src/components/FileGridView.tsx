import { Folder, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { FileContextMenu } from "@/features/files/components/FileContextMenu"

export interface FileItem {
  id: number // fileId or folderId
  name: string
  type: "folder" | "file"
  lastModified: string
  permission: string
  size: string
  mimeType?: string // Only for files
}

interface FileGridViewProps {
  files: FileItem[]
  selected: Set<string>
  onSelect: (name: string, ctrlKey: boolean) => void
  onDoubleClick?: (item: FileItem) => void
  onContextMenu?: (item: FileItem, event: React.MouseEvent) => void
  onDeselectAll?: () => void
}

export function FileGridView({ files, selected, onSelect, onDoubleClick, onDeselectAll }: FileGridViewProps) {
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only deselect if clicking directly on the container or grid (empty space)
    const target = e.target as HTMLElement
    if (target === e.currentTarget || target.classList.contains('grid') || target === e.currentTarget.querySelector('.grid')) {
      onDeselectAll?.()
    }
  }

  return (
    <div 
      className="flex-1 bg-card h-full overflow-y-auto p-4"
      onClick={handleContainerClick}
    >
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
        onClick={(e) => {
          // If clicking on the grid container itself (not on a file/folder), deselect
          if (e.target === e.currentTarget) {
            onDeselectAll?.()
          }
        }}
      >
        {files.map((file) => (
          <FileContextMenu
            key={`${file.type}-${file.id}`}
            item={file}
            onSelect={(item, ctrlKey) => onSelect(item.name, ctrlKey)}
          >
            <div
              onClick={(e) => {
                e.stopPropagation() // Prevent event from bubbling to container
                onSelect(file.name, e.ctrlKey || e.metaKey)
              }}
              onDoubleClick={() => onDoubleClick?.(file)}
              className={cn(
                "flex flex-col items-center p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                selected.has(file.name)
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card"
              )}
            >
              <div className={cn(
                "mb-2 sm:mb-3",
                selected.has(file.name) ? "text-primary" : file.type === "folder" ? "text-primary" : "text-muted-foreground"
              )}>
                {file.type === "folder" ? (
                  <Folder className="w-8 h-8 sm:w-12 sm:h-12" />
                ) : (
                  <File className="w-8 h-8 sm:w-12 sm:h-12" />
                )}
              </div>
              <div className="w-full text-center">
                <p className={cn(
                  "text-xs sm:text-sm font-medium truncate w-full",
                  selected.has(file.name) ? "text-primary font-semibold" : "text-foreground"
                )} title={file.name}>
                  {file.name}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  selected.has(file.name) ? "text-primary/80" : "text-muted-foreground"
                )}>
                  {file.size}
                </p>
              </div>
            </div>
          </FileContextMenu>
        ))}
      </div>
    </div>
  )
}

