import { useTranslation } from "react-i18next"
import { Clock } from "lucide-react"

export function Recent() {
  const { t } = useTranslation()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{t("sidebar.recent")}</h1>
        </div>

        <div className="bg-card border border-border rounded-lg p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Clock className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No recent files</h3>
            <p className="text-muted-foreground">
              Files you've recently accessed will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

