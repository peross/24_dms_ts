import { Folder, File } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FileItem {
  name: string
  type: "folder" | "file"
  lastModified: string
  permission: string
  size: string
}

interface FileGridViewProps {
  files: FileItem[]
  selected: string | null
  onSelect: (name: string) => void
}

export function FileGridView({ files, selected, onSelect }: FileGridViewProps) {
  return (
    <div className="flex-1 bg-card h-full overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {files.map((file) => (
          <div
            key={file.name}
            onClick={() => onSelect(file.name)}
            className={cn(
              "flex flex-col items-center p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
              selected === file.name
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card"
            )}
          >
            <div className={cn(
              "mb-2 sm:mb-3",
              selected === file.name ? "text-primary" : file.type === "folder" ? "text-primary" : "text-muted-foreground"
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
                selected === file.name ? "text-primary font-semibold" : "text-foreground"
              )} title={file.name}>
                {file.name}
              </p>
              <p className={cn(
                "text-xs mt-1",
                selected === file.name ? "text-primary/80" : "text-muted-foreground"
              )}>
                {file.size}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

