import { useTranslation } from "react-i18next"
import { Users as UsersIcon } from "lucide-react"

export function AdminUsers() {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="w-8 h-8" />
            {t("sidebar.users")}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system users
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Users management interface coming soon...</p>
        </div>
      </div>
    </div>
  )
}

