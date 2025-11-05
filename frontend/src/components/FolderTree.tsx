import { useState } from "react"
import { Folder, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useFolderTree } from "@/features/folders/hooks/useFolders"
import { useLayout } from "@/components/Layout"

interface TreeNode {
  folderId: number
  name: string
  path: string
  children?: TreeNode[]
}

interface TreeNodeComponentProps {
  node: TreeNode
  level?: number
  expanded: Set<number>
  selectedFolderId: number | null
  onToggle: (folderId: number) => void
  onSelect: (folderId: number, path: string) => void
}

function TreeNodeComponent({ node, level = 0, expanded, selectedFolderId, onToggle, onSelect }: TreeNodeComponentProps) {
  const folderId = node.folderId
  const isExpanded = expanded.has(folderId)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = selectedFolderId === folderId

  const handleClick = () => {
    if (hasChildren) {
      onToggle(folderId)
    }
    onSelect(folderId, node.path)
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent transition-colors",
          level > 0 && "ml-4",
          isSelected && "bg-primary/15 dark:bg-primary/20 text-primary"
        )}
        onClick={handleClick}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <Folder className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.folderId}
              node={child}
              level={level + 1}
              expanded={expanded}
              selectedFolderId={selectedFolderId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Convert folder tree from API to TreeNode structure
 */
function convertFolderTree(folders: FolderTreeNode[]): TreeNode[] {
  return folders.map((folder) => ({
    folderId: folder.folderId,
    name: folder.name,
    path: folder.path,
    children: folder.children ? convertFolderTree(folder.children) : undefined,
  }))
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: number, path: string) => void
}

export function FolderTree({ onFolderSelect }: FolderTreeProps) {
  const { t } = useTranslation()
  const { selectedFolderId, setSelectedFolderId, setSelectedFolderPath } = useLayout()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const { data, isLoading, error, refetch } = useFolderTree()

  const handleToggle = (folderId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleSelect = (folderId: number, path: string) => {
    setSelectedFolderId(folderId)
    setSelectedFolderPath(path)
    if (onFolderSelect) {
      onFolderSelect(folderId, path)
    }
  }

  const treeData = data?.tree ? convertFolderTree(data.tree) : []

  return (
    <div className="w-full lg:w-80 bg-card border-r border-border h-full overflow-y-auto shrink-0 flex flex-col">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="font-semibold text-sm sm:text-base">{t('folders.title')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-destructive mb-2">{t('folders.failedToLoad')}</p>
            <button
              onClick={() => refetch()}
              className="text-xs text-primary hover:underline"
            >
              {t('folders.retry')}
            </button>
          </div>
        ) : treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Folder className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">{t('folders.noFolders')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('folders.createFirstFolder')}</p>
          </div>
        ) : (
          treeData.map((node) => (
            <TreeNodeComponent
              key={node.folderId}
              node={node}
              expanded={expanded}
              selectedFolderId={selectedFolderId}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
