"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { uploadFile, getUploads, deleteUpload } from "@/lib/actions";
import { Upload, Trash2, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

interface UploadRecord {
  id: number;
  fileName: string;
  uploadedAt: Date;
  _count: { sales: number };
}

interface DuplicateInfo {
  rowNumber: number;
  customerName: string;
  sellerName: string;
  plan: string;
  zone: string;
  date: string;
}

interface UploadResult {
  uploadId: number;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  dbDuplicates: number;
  duplicates: DuplicateInfo[];
  detectedHeaders: string[];
  mappedColumns: Record<string, number>;
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUploads = async () => {
    const data = await getUploads();
    setUploads(data);
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;
    if (!file || !file.name) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const res = await uploadFile(formData);
      setResult(res);
      await loadUploads();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteUpload(id);
    await loadUploads();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <span>📤</span> Upload Excel File
      </h1>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Upload Monthly Report
          </CardTitle>
          <CardDescription>Upload a .xlsx file with the monthly sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex items-center gap-4">
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls"
              className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            <Button type="submit" disabled={uploading} className="gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Upload Complete
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-sm">
                  <div className="rounded-md bg-background p-2 text-center border">
                    <p className="text-muted-foreground text-xs">Total Rows</p>
                    <p className="font-bold">{result.totalRows}</p>
                  </div>
                  <div className="rounded-md bg-background p-2 text-center border">
                    <p className="text-muted-foreground text-xs">✅ Valid</p>
                    <p className="font-bold text-green-600">{result.validRows}</p>
                  </div>
                  <div className="rounded-md bg-background p-2 text-center border">
                    <p className="text-muted-foreground text-xs">⏭️ Skipped</p>
                    <p className="font-bold text-orange-600">{result.skippedRows}</p>
                  </div>
                  <div className="rounded-md bg-background p-2 text-center border">
                    <p className="text-muted-foreground text-xs">🔄 File Dups</p>
                    <p className="font-bold text-yellow-600">{result.duplicateRows}</p>
                  </div>
                  <div className="rounded-md bg-background p-2 text-center border">
                    <p className="text-muted-foreground text-xs">🗄️ DB Dups</p>
                    <p className="font-bold text-yellow-600">{result.dbDuplicates}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="font-medium text-sm">🔍 Detected Excel Headers:</p>
                <div className="flex flex-wrap gap-1">
                  {result.detectedHeaders?.map((h, i) => (
                    <span key={i} className="text-xs bg-background border rounded-full px-2.5 py-1">
                      [{i}] {h}
                    </span>
                  ))}
                </div>
                <p className="font-medium text-sm mt-2">🔗 Mapped Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {result.mappedColumns && Object.entries(result.mappedColumns).map(([key, idx]) => (
                    <span key={key} className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full px-2.5 py-1">
                      {key} → col {idx}
                    </span>
                  ))}
                </div>
                {result.mappedColumns && !("medioPago" in result.mappedColumns) && (
                  <p className="text-sm text-destructive font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    &quot;medioPago&quot; (payment method) was NOT detected! Check header name.
                  </p>
                )}
              </div>

              {result.duplicates.length > 0 && (
                <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 space-y-2">
                  <p className="font-medium text-sm">⚠️ Duplicate rows (removed):</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Zone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.duplicates.map((dup, i) => (
                        <TableRow key={i}>
                          <TableCell>{dup.rowNumber}</TableCell>
                          <TableCell>{dup.date}</TableCell>
                          <TableCell>{dup.customerName}</TableCell>
                          <TableCell>{dup.sellerName}</TableCell>
                          <TableCell>{dup.plan}</TableCell>
                          <TableCell>{dup.zone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📂</span> Previous Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <span className="text-4xl mb-2">📭</span>
              <p className="text-sm">No uploads yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>📄 File Name</TableHead>
                  <TableHead>📅 Date</TableHead>
                  <TableHead>🛒 Sales Count</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fileName}</TableCell>
                    <TableCell>{new Date(u.uploadedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{u._count.sales}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(u.id)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
