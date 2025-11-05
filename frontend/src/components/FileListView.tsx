import { Folder, File } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FileItem } from "./FileGridView"
import { FileContextMenu } from "@/features/files/components/FileContextMenu"

interface FileListViewProps {
  files: FileItem[]
  selected: Set<string>
  onSelect: (name: string, ctrlKey: boolean) => void
  onDoubleClick?: (item: FileItem) => void
  onContextMenu?: (item: FileItem, event: React.MouseEvent) => void
}

export function FileListView({ files, selected, onSelect, onDoubleClick, onContextMenu }: FileListViewProps) {
  return (
    <div className="flex-1 bg-card h-full overflow-y-auto min-w-0">
      <div className="border-b border-border overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-muted-foreground hidden sm:table-cell">Last modified</th>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-muted-foreground hidden md:table-cell">Permission</th>
              <th className="text-left px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-muted-foreground">Size</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <FileContextMenu
                key={`${file.type}-${file.id}`}
                item={file}
              >
                <tr
                  className={cn(
                    "cursor-pointer hover:bg-accent transition-colors",
                    selected.has(file.name) && "bg-primary/15 dark:bg-primary/20"
                  )}
                  onClick={(e) => onSelect(file.name, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onDoubleClick?.(file)}
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2">
                      {file.type === "folder" ? (
                        <Folder className={cn("w-4 h-4 shrink-0", selected.has(file.name) ? "text-primary" : "text-primary")} />
                      ) : (
                        <File className={cn("w-4 h-4 shrink-0", selected.has(file.name) ? "text-primary" : "text-muted-foreground")} />
                      )}
                      <span className={cn(
                        "text-xs sm:text-sm truncate font-medium",
                        selected.has(file.name) && "text-primary"
                      )}>{file.name}</span>
                    </div>
                  </td>
                  <td className={cn("px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden sm:table-cell", selected.has(file.name) ? "text-primary" : "text-muted-foreground")}>{file.lastModified}</td>
                  <td className={cn("px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell", selected.has(file.name) ? "text-primary" : "text-muted-foreground")}>{file.permission}</td>
                  <td className={cn("px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm", selected.has(file.name) ? "text-primary" : "text-muted-foreground")}>{file.size}</td>
                </tr>
              </FileContextMenu>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

