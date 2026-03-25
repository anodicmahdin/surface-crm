"use client"

import { useState, useCallback, useRef } from "react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityType = "contacts" | "companies"

interface FieldDef {
  key: string
  label: string
  required?: boolean
}

const CONTACT_FIELDS: FieldDef[] = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "title", label: "Job Title" },
  { key: "companyName", label: "Company" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
]

const COMPANY_FIELDS: FieldDef[] = [
  { key: "name", label: "Company Name", required: true },
  { key: "domain", label: "Domain" },
  { key: "industry", label: "Industry" },
  { key: "headcount", label: "Headcount" },
  { key: "annualRevenue", label: "Annual Revenue" },
  { key: "fundingStage", label: "Funding Stage" },
  { key: "location", label: "Location" },
  { key: "description", label: "Description" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "websiteUrl", label: "Website URL" },
]

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "\n" && !inQuotes) {
      if (current || lines.length > 0) lines.push(current)
      current = ""
    } else if (ch === "\r" && !inQuotes) {
      if (text[i + 1] === "\n") i++ // skip \r in \r\n
      if (current || lines.length > 0) lines.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)

  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let field = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { field += '"'; i++ }
        else inQ = !inQ
      } else if (ch === "," && !inQ) {
        fields.push(field.trim())
        field = ""
      } else {
        field += ch
      }
    }
    fields.push(field.trim())
    return fields
  }

  const headers = parseRow(lines[0])
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseRow(line)
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
    })

  return { headers, rows }
}

// ─── Auto-detect column mapping ───────────────────────────────────────────────

const HEADER_MAP: Record<string, string> = {
  firstname: "firstName", first: "firstName", fname: "firstName",
  lastname: "lastName", last: "lastName", lname: "lastName", surname: "lastName",
  email: "email", emailaddress: "email", mail: "email",
  phone: "phone", phonenumber: "phone", mobile: "phone", tel: "phone",
  title: "title", jobtitle: "title", position: "title", role: "role",
  company: "companyName", companyname: "companyName", organization: "companyName", org: "companyName",
  linkedin: "linkedinUrl", linkedinurl: "linkedinUrl", linkedinprofile: "linkedinUrl",
  source: "source", leadsource: "source",
  status: "status", leadstatus: "status",
  name: "name", companyname2: "name",
  domain: "domain", website: "websiteUrl", websiteurl: "websiteUrl", url: "websiteUrl",
  industry: "industry", sector: "industry",
  headcount: "headcount", employees: "headcount", employeecount: "headcount", size: "headcount",
  revenue: "annualRevenue", annualrevenue: "annualRevenue", arr: "annualRevenue",
  fundingstage: "fundingStage", funding: "fundingStage", stage: "fundingStage",
  location: "location", city: "location", country: "location", address: "location",
  description: "description", about: "description", notes: "description",
}

function autoDetectMapping(header: string, fields: FieldDef[]): string {
  const key = header.toLowerCase().replace(/[\s_\-\.]/g, "")
  const detected = HEADER_MAP[key]
  if (!detected) return ""
  return fields.some((f) => f.key === detected) ? detected : ""
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CsvImporterProps {
  entityType: EntityType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = "upload" | "map" | "result"

interface ImportResult {
  created: number
  updated?: number
  errors: { row: number; error: string }[]
  total: number
}

export function CsvImporter({ entityType, open, onOpenChange, onSuccess }: CsvImporterProps) {
  const fields = entityType === "contacts" ? CONTACT_FIELDS : COMPANY_FIELDS
  const label = entityType === "contacts" ? "Contacts" : "Companies"

  const [step, setStep] = useState<Step>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importContactsMutation = trpc.contacts.importCsv.useMutation()
  const importCompaniesMutation = trpc.companies.importCsv.useMutation()

  const reset = useCallback(() => {
    setStep("upload")
    setFileName("")
    setHeaders([])
    setCsvRows([])
    setMapping({})
    setResult(null)
    setIsImporting(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(reset, 300)
  }, [onOpenChange, reset])

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows } = parseCsv(text)
      if (h.length === 0) { toast.error("Could not parse CSV — check file format"); return }
      if (rows.length === 0) { toast.error("CSV file has no data rows"); return }

      const initialMapping: Record<string, string> = {}
      h.forEach((header) => {
        initialMapping[header] = autoDetectMapping(header, fields)
      })

      setFileName(file.name)
      setHeaders(h)
      setCsvRows(rows)
      setMapping(initialMapping)
      setStep("map")
    }
    reader.readAsText(file)
  }, [fields])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const requiredMapped = fields
    .filter((f) => f.required)
    .every((f) => Object.values(mapping).includes(f.key))

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const mapped = csvRows.map((row) => {
        const obj: Record<string, string> = {}
        Object.entries(mapping).forEach(([csvHeader, fieldKey]) => {
          if (fieldKey) obj[fieldKey] = row[csvHeader] ?? ""
        })
        return obj
      })

      let res: ImportResult
      if (entityType === "contacts") {
        res = await importContactsMutation.mutateAsync({ rows: mapped as never })
      } else {
        res = await importCompaniesMutation.mutateAsync({ rows: mapped as never })
      }

      setResult(res)
      setStep("result")
      if (res.created > 0) {
        onSuccess()
        toast.success(`Imported ${res.created} ${label.toLowerCase()} successfully`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {label} from CSV</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          {(["upload", "map", "result"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3 w-3" />}
              <span className={cn(step === s && "text-foreground font-medium capitalize")}>
                {s === "upload" ? "1. Upload" : s === "map" ? "2. Map Columns" : "3. Results"}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
              <p className="font-medium">Expected columns for {label.toLowerCase()}:</p>
              <p className="text-muted-foreground">
                {fields.map((f) => (f.required ? `${f.label}*` : f.label)).join(", ")}
              </p>
              <p className="text-muted-foreground text-xs mt-2">* Required. Column names are auto-detected.</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Map Columns ── */}
        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{fileName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{csvRows.length} rows</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={reset}>
                <X className="h-3 w-3 mr-1" /> Change file
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSV Column</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Maps to</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{header}</td>
                      <td className="px-3 py-2 w-44">
                        <Select
                          value={mapping[header] || "__skip__"}
                          onValueChange={(val) =>
                            setMapping((prev) => ({ ...prev, [header]: val === "__skip__" ? "" : val }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">
                              <span className="text-muted-foreground">— Skip —</span>
                            </SelectItem>
                            {fields.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[160px]">
                        {csvRows[0]?.[header] || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!requiredMapped && (
              <p className="text-sm text-destructive">
                Map all required fields (*) before importing.
              </p>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{mappedCount} of {headers.length} columns mapped</p>
              <Button onClick={handleImport} disabled={!requiredMapped || isImporting}>
                {isImporting ? "Importing…" : `Import ${csvRows.length} ${label}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === "result" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.created}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              {result.updated !== undefined && result.updated > 0 && (
                <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.updated}</p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border text-sm">
                <div className="px-3 py-2 bg-muted/50 font-medium border-b">Errors</div>
                {result.errors.map((err) => (
                  <div key={err.row} className="px-3 py-1.5 border-b last:border-0 flex gap-2">
                    <span className="text-muted-foreground shrink-0">Row {err.row}:</span>
                    <span className="text-destructive">{err.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleClose}>Done</Button>
              <Button variant="outline" onClick={reset}>Import another file</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
