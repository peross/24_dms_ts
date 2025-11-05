import { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { Loader2 } from "lucide-react"

interface ExcelViewerProps {
  file: Blob
}

export function ExcelViewer({ file }: ExcelViewerProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    file.arrayBuffer()
      .then((buffer) => {
        const wb = XLSX.read(buffer, { type: "array" })
        setWorkbook(wb)
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0])
        }
      })
      .catch((err) => {
        console.error("Failed to parse Excel file:", err)
        setError("Failed to load Excel file")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [file])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !workbook) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-destructive">{error || "Failed to load Excel file"}</p>
        </div>
      </div>
    )
  }

  const currentSheet = workbook.Sheets[selectedSheet]
  const jsonData = XLSX.utils.sheet_to_json(currentSheet, { header: 1, defval: "" })

  return (
    <div className="flex flex-col h-full">
      {/* Sheet Selector */}
      {workbook.SheetNames.length > 1 && (
        <div className="flex items-center gap-2 p-4 border-b bg-muted/50 shrink-0 overflow-x-auto">
          {workbook.SheetNames.map((sheetName) => (
            <button
              key={sheetName}
              onClick={() => setSelectedSheet(sheetName)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedSheet === sheetName
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {sheetName}
            </button>
          ))}
        </div>
      )}

      {/* Excel Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="inline-block min-w-full">
          <table className="border-collapse border border-border">
            <tbody>
              {jsonData.map((row: any, rowIndex: number) => (
                <tr key={rowIndex}>
                  {Array.isArray(row) ? (
                    row.map((cell: any, cellIndex: number) => (
                      <td
                        key={cellIndex}
                        className="border border-border px-3 py-2 text-sm bg-background"
                      >
                        {cell !== null && cell !== undefined ? String(cell) : ""}
                      </td>
                    ))
                  ) : (
                    <td className="border border-border px-3 py-2 text-sm bg-background">
                      {row}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

