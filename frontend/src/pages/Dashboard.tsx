import { useTranslation } from "react-i18next"
import { LayoutDashboard, Folder, Users, Clock, Trash2, FileText } from "lucide-react"
import { Link } from "react-router-dom"

export function Dashboard() {
  const { t } = useTranslation()

  const quickAccessItems = [
    { icon: Folder, label: t("sidebar.files"), path: "/files", description: t("dashboard.filesDescription") },
    { icon: Users, label: t("sidebar.shared"), path: "/shared", description: t("dashboard.sharedDescription") },
    { icon: Clock, label: t("sidebar.recent"), path: "/recent", description: t("dashboard.recentDescription") },
    { icon: Trash2, label: t("sidebar.trash"), path: "/trash", description: t("dashboard.trashDescription") },
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8" />
            {t("sidebar.dashboard")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("dashboard.welcome")}
          </p>
        </div>

        {/* Quick Access Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.quickAccess")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.path} to={item.path}>
                  <div className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors cursor-pointer h-full">
                    <Icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity (placeholder) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">{t("dashboard.recentActivity")}</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("dashboard.noRecentActivity")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats (placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground mt-1">{t("dashboard.totalFiles")}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-2xl font-bold">0 GB</div>
            <div className="text-sm text-muted-foreground mt-1">{t("dashboard.storageUsed")}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground mt-1">{t("dashboard.sharedFiles")}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
