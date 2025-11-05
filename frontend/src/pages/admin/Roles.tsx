import { useTranslation } from "react-i18next"
import { Shield } from "lucide-react"

export function AdminRoles() {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8" />
            {t("sidebar.roles")}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system roles
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Roles management interface coming soon...</p>
        </div>
      </div>
    </div>
  )
}

