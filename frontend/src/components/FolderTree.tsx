import { useState } from "react"
import { Folder, File, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface TreeNode {
  name: string
  type: "folder" | "file"
  children?: TreeNode[]
}

const treeData: TreeNode[] = [
  {
    name: "scripts",
    type: "folder",
    children: [],
  },
  {
    name: "front-end",
    type: "folder",
    children: [],
  },
  {
    name: "Web assets",
    type: "folder",
    children: [
      { name: "logs", type: "folder", children: [] },
      { name: "testfolder", type: "folder", children: [] },
      { name: "public_html", type: "folder", children: [] },
      { name: "testfile.txt", type: "file" },
      { name: "localhost.sql", type: "file" },
      { name: "index.html", type: "file" },
      { name: "about.php", type: "file" },
    ],
  },
  {
    name: "backup_files",
    type: "folder",
    children: [],
  },
  {
    name: "others",
    type: "folder",
    children: [],
  },
  {
    name: "New folder",
    type: "folder",
    children: [],
  },
]

interface TreeNodeComponentProps {
  node: TreeNode
  level?: number
  expanded: Set<string>
  onToggle: (path: string) => void
}

function TreeNodeComponent({ node, level = 0, expanded, onToggle }: TreeNodeComponentProps) {
  const path = node.name
  const isExpanded = expanded.has(path)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
          level > 0 && "ml-4"
        )}
        onClick={() => hasChildren && onToggle(path)}
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
        {node.type === "folder" ? (
          <Folder className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <File className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeComponent
              key={child.name}
              node={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderTree() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["Web assets"]))

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  return (
    <div className="w-full lg:w-80 bg-card border-r border-border h-full overflow-y-auto shrink-0">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm sm:text-base">Folder name</h2>
      </div>
      <div className="p-2">
        {treeData.map((node) => (
          <TreeNodeComponent
            key={node.name}
            node={node}
            expanded={expanded}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}
