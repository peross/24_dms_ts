import { useTranslation } from "react-i18next"
import { Settings as SettingsIcon, Shield, AlertCircle } from "lucide-react"
import { RoleGuard } from "@/components/RoleGuard"
import { useRole } from "@/hooks/useRole"

export function Settings() {
  const { t } = useTranslation()
  const { roles, isAdmin, isSuperAdmin } = useRole()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-8 h-8" />
          {t("sidebar.settings")}
        </h1>

        {/* User Role Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Roles
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {roles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                {role}
              </span>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Admin: {isAdmin() ? "Yes" : "No"}</p>
            <p>Super Admin: {isSuperAdmin() ? "Yes" : "No"}</p>
          </div>
        </div>

        {/* Admin Only Section */}
        <RoleGuard requireAdmin fallback={
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1">
                Admin Access Required
              </h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                You need admin privileges to access this section.
              </p>
            </div>
          </div>
        }>
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Admin Settings</h2>
            <p className="text-muted-foreground">
              This section is only visible to administrators and super administrators.
            </p>
          </div>
        </RoleGuard>

        {/* Super Admin Only Section */}
        <RoleGuard requireSuperAdmin fallback={null}>
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Super Admin Settings</h2>
            <p className="text-muted-foreground">
              This section is only visible to super administrators.
            </p>
          </div>
        </RoleGuard>
      </div>
    </div>
  )
}

