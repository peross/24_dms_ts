import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useScanners, useStartScan } from "@/features/scanning/hooks/useScanners"
import { Loader2, RefreshCw, ScanLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "idle":
      return "secondary"
    case "busy":
      return "default"
    case "offline":
      return "destructive"
    default:
      return "outline"
  }
}

export function Scanning() {
  const { t } = useTranslation()
  const { data, isLoading, isFetching, refetch } = useScanners()
  const startScan = useStartScan()

  const scanners = data?.scanners ?? []

  const isMutating = useMemo(() => startScan.isPending, [startScan.isPending])

  const handleStartScan = (scannerId: string, scannerName: string) => {
    startScan.mutate(scannerId, {
      onSuccess: () => {
        toast.success(t("scanning.scanStarted", { name: scannerName }))
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error || error?.message || t("scanning.failedToStart")
        toast.error(message)
      },
    })
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScanLine className="w-6 h-6" />
              {t("scanning.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("scanning.description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
              {t("scanning.refresh")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">{t("scanning.loading")}</p>
          </div>
        ) : scanners.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>{t("scanning.noScannersTitle")}</CardTitle>
              <CardDescription>{t("scanning.noScannersDescription")}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scanners.map((scanner) => (
              <Card key={scanner.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{scanner.name}</CardTitle>
                      {scanner.location ? (
                        <CardDescription>{scanner.location}</CardDescription>
                      ) : null}
                    </div>
                    <Badge variant={getStatusVariant(scanner.status)} className="capitalize">
                      {t(`scanning.status.${scanner.status}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {scanner.manufacturer ? (
                    <div className="text-sm text-muted-foreground">
                      {t("scanning.manufacturer")}: {scanner.manufacturer}
                    </div>
                  ) : null}
                  {scanner.lastUsedAt ? (
                    <div className="text-sm text-muted-foreground">
                      {t("scanning.lastUsed", {
                        date: new Date(scanner.lastUsedAt).toLocaleString(),
                      })}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <Button
                    onClick={() => handleStartScan(scanner.id, scanner.name)}
                    disabled={scanner.status !== "idle" || isMutating}
                  >
                    {startScan.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ScanLine className="w-4 h-4 mr-2" />
                    )}
                    {t("scanning.start")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
