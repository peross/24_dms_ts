import { useTranslation } from "react-i18next"
import { UserCog } from "lucide-react"

export function AdminUserRoles() {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="w-8 h-8" />
            {t("sidebar.userRoles")}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user role assignments
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">User roles management interface coming soon...</p>
        </div>
      </div>
    </div>
  )
}

