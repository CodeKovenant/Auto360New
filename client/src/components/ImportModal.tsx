import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getAuthToken } from "@/lib/auth";

type ImportType = "cars" | "parts" | "services" | "support-services";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  type: ImportType;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

const TYPE_LABELS: Record<ImportType, string> = {
  cars: "Cars",
  parts: "Spare Parts",
  services: "Garage Services",
  "support-services": "Services",
};

const TYPE_COLUMNS: Record<ImportType, { col: string; required: boolean; note?: string }[]> = {
  cars: [
    { col: "title", required: true },
    { col: "brand", required: true },
    { col: "model", required: true },
    { col: "year", required: true, note: "e.g. 2020" },
    { col: "price", required: true, note: "number only, e.g. 6500000" },
    { col: "mileage", required: false, note: "km, e.g. 35000" },
    { col: "fuelType", required: false, note: "petrol / diesel / electric / hybrid" },
    { col: "transmission", required: false, note: "automatic / manual" },
    { col: "condition", required: false, note: "used / new" },
    { col: "location", required: true },
    { col: "description", required: false },
  ],
  parts: [
    { col: "partName", required: true },
    { col: "carBrand", required: true },
    { col: "carModel", required: true },
    { col: "year", required: false },
    { col: "condition", required: false, note: "new / used / refurbished" },
    { col: "price", required: false, note: "e.g. KSh 2500" },
    { col: "description", required: false },
  ],
  services: [
    { col: "name", required: true },
    { col: "description", required: false },
    { col: "price", required: false, note: "e.g. KSh 2500" },
  ],
  "support-services": [
    { col: "name", required: true },
    { col: "description", required: false },
    { col: "price", required: false, note: "e.g. KSh 15000/year" },
  ],
};

function parseCSVPreview(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1, 6).filter(l => l.trim()).map(line => {
    const values: string[] = [];
    let cur = "", inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    return values.map(v => v.replace(/^"|"$/g, ""));
  });
  return { headers, rows };
}

export default function ImportModal({ open, onClose, type }: ImportModalProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setPreview(parseCSVPreview(text));
    };
    reader.readAsText(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function downloadTemplate() {
    const a = document.createElement("a");
    a.href = `/api/import/template/${type}`;
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(a.href, { headers })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `${type}-template.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      const authToken = getAuthToken();
      const res = await fetch(`/api/import/${type}`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Import failed" }));
        throw new Error(err.message || "Import failed");
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (data.imported > 0) {
        toast({ title: `${data.imported} ${TYPE_LABELS[type]} imported successfully!` });
      }
      if (data.failed > 0) {
        toast({ title: `${data.failed} rows failed`, description: "Check the error details below.", variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  function handleClose() {
    setFile(null);
    setPreview(null);
    setResult(null);
    onClose();
  }

  const columns = TYPE_COLUMNS[type];
  const label = TYPE_LABELS[type];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {label} from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-import {label.toLowerCase()} into your business listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-md border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Not sure of the format? Download the template CSV first.</span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Template
            </Button>
          </div>

          {/* Column reference */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Required columns</p>
            <div className="flex flex-wrap gap-2">
              {columns.map(c => (
                <div
                  key={c.col}
                  className={`text-xs px-2 py-1 rounded-md border font-mono ${c.required ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300" : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}
                >
                  {c.col}{c.required && <span className="ml-0.5 text-red-500">*</span>}
                  {c.note && <span className="ml-1 opacity-60 font-sans font-normal">({c.note})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* File drop area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            {file ? (
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag & drop a CSV file here</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse — max 2 MB</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && preview.headers.length > 0 && !result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Preview (first {preview.rows.length} rows)
              </p>
              <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {preview.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="bg-white dark:bg-gray-900">
                        {preview.headers.map((_, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{row[j] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{result.imported}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">imported</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-md border px-4 py-3 ${result.failed > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"}`}>
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${result.failed > 0 ? "text-red-500" : "text-gray-400"}`} />
                  <div>
                    <p className={`text-lg font-bold ${result.failed > 0 ? "text-red-700 dark:text-red-300" : "text-gray-500"}`}>{result.failed}</p>
                    <p className={`text-xs ${result.failed > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>failed</p>
                  </div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">Errors</p>
                  </div>
                  <ul className="space-y-1">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-xs text-muted-foreground">…and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-3.5 h-3.5 mr-1" />
              {result ? "Close" : "Cancel"}
            </Button>
            {result ? (
              <Button variant="outline" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>
                Import Another
              </Button>
            ) : (
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!file || importMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {importMutation.isPending ? "Importing..." : `Import ${label}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
