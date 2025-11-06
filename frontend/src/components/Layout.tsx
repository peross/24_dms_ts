import { useState, useCallback, ReactNode, createContext, useContext, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { Header } from "@/components/Header"
import { TopBar } from "@/components/TopBar"
import { type ViewMode } from "@/components/FileList"

interface LayoutContextType {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedFolderId: number | null
  setSelectedFolderId: (folderId: number | null) => void
  selectedFolderPath: string
  setSelectedFolderPath: (path: string) => void
  // File/folder selection state
  selectedItems: Set<string>
  setSelectedItems: (items: Set<string>) => void
  // File viewer state for text files
  isTextFile: boolean
  setTextFileSaveHandler: (handler: (() => Promise<void>) | null) => void
  getTextFileSaveHandler: () => (() => Promise<void>) | null
  // Navigation history
  navigationHistory: string[]
  navigationHistoryIndex: number
  navigateToFolder: (folderId: number | null, systemFolderId?: number) => void
  navigateToRoute: (path: string) => void
  navigateBack: () => void
  navigateForward: () => void
  canNavigateBack: boolean
  canNavigateForward: boolean
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function useLayout() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayout must be used within Layout")
  }
  return context
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [textFileSaveHandler, setTextFileSaveHandler] = useState<(() => Promise<void>) | null>(null)
  
  // Navigation history - track route paths
  const [navigationHistory, setNavigationHistory] = useState<string[]>(["/files"])
  const [navigationHistoryIndex, setNavigationHistoryIndex] = useState<number>(0)
  
  const getTextFileSaveHandler = () => textFileSaveHandler
  const isTextFile = textFileSaveHandler !== null
  
  // Navigation functions
  const navigateToFolder = useCallback((folderId: number | null, systemFolderId?: number) => {
    const path = "/files"
    
    // Build query parameters
    const params = new URLSearchParams()
    
    // Check if folderId is a system folder ID (1, 2, or 3)
    if (folderId !== null && [1, 2, 3].includes(folderId)) {
      params.set('system_folder_id', folderId.toString())
    } else if (folderId !== null) {
      // For regular folders, include both system_folder_id and folder_id
      if (systemFolderId !== undefined) {
        params.set('system_folder_id', systemFolderId.toString())
      }
      params.set('folder_id', folderId.toString())
    }
    
    const queryString = params.toString()
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    setNavigationHistory(prev => {
      // Remove any forward history if we're not at the end
      const newHistory = prev.slice(0, navigationHistoryIndex + 1)
      // Add the new route to history if it's different from current
      if (newHistory[newHistory.length - 1] !== fullPath) {
        newHistory.push(fullPath)
        setNavigationHistoryIndex(newHistory.length - 1)
      }
      return newHistory
    })
    setSelectedFolderId(folderId)
    // Clear selection when navigating to a different folder
    setSelectedItems(new Set())
    navigate(fullPath)
  }, [navigationHistoryIndex, navigate, setSelectedItems])
  
  const navigateToRoute = useCallback((path: string) => {
    setNavigationHistory(prev => {
      // Remove any forward history if we're not at the end
      const newHistory = prev.slice(0, navigationHistoryIndex + 1)
      // Add the new route to history if it's different from current
      if (newHistory[newHistory.length - 1] !== path) {
        newHistory.push(path)
        setNavigationHistoryIndex(newHistory.length - 1)
      }
      return newHistory
    })
    navigate(path)
  }, [navigationHistoryIndex, navigate])
  
  const navigateBack = useCallback(() => {
    if (navigationHistoryIndex > 0) {
      const newIndex = navigationHistoryIndex - 1
      const previousPath = navigationHistory[newIndex]
      setNavigationHistoryIndex(newIndex)
      navigate(previousPath)
    }
  }, [navigationHistory, navigationHistoryIndex, navigate])
  
  const navigateForward = useCallback(() => {
    if (navigationHistoryIndex < navigationHistory.length - 1) {
      const newIndex = navigationHistoryIndex + 1
      const nextPath = navigationHistory[newIndex]
      setNavigationHistoryIndex(newIndex)
      navigate(nextPath)
    }
  }, [navigationHistory, navigationHistoryIndex, navigate])
  
  const canNavigateBack = navigationHistoryIndex > 0
  const canNavigateForward = navigationHistoryIndex < navigationHistory.length - 1
  
  // Sync navigation history with current route when it changes externally (e.g., direct URL navigation)
  useEffect(() => {
    const currentPath = location.pathname
    const currentHistoryPath = navigationHistory[navigationHistoryIndex]
    
    // Only add to history if route changed externally and it's not already in history
    if (currentPath !== currentHistoryPath) {
      // Check if this path is already in history (forward navigation)
      const existingIndex = navigationHistory.indexOf(currentPath)
      if (existingIndex !== -1) {
        // Path exists in history, just update index
        setNavigationHistoryIndex(existingIndex)
      } else {
        // New path, add to history
        setNavigationHistory(prev => {
          const newHistory = prev.slice(0, navigationHistoryIndex + 1)
          newHistory.push(currentPath)
          setNavigationHistoryIndex(newHistory.length - 1)
          return newHistory
        })
      }
    }
  }, [location.pathname])

  // Show full Header on Files page and File Viewer page, use minimal TopBar for other pages
  const isFilesPage = location.pathname === "/files"
  const isFileViewerPage = location.pathname.startsWith("/files/view/")

  return (
    <LayoutContext.Provider value={{ 
      viewMode, 
      setViewMode, 
      selectedFolderId, 
      setSelectedFolderId, 
      selectedFolderPath, 
      setSelectedFolderPath,
      selectedItems,
      setSelectedItems,
      isTextFile,
      setTextFileSaveHandler,
      getTextFileSaveHandler,
      navigationHistory,
      navigationHistoryIndex,
      navigateToFolder,
      navigateToRoute,
      navigateBack,
      navigateForward,
      canNavigateBack,
      canNavigateForward
    }}>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {isFilesPage || isFileViewerPage ? (
            <Header 
              onMobileMenuClick={() => setMobileMenuOpen(true)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          ) : (
            <TopBar 
              onMobileMenuClick={() => setMobileMenuOpen(true)}
            />
          )}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}

