import { useState } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { FolderTree } from "@/components/FolderTree"
import { FileList, type ViewMode } from "@/components/FileList"

export function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header 
          onMobileMenuClick={() => setMobileMenuOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <FolderTree />
          <FileList viewMode={viewMode} />
        </div>
      </div>
    </div>
  )
}
