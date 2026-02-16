"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Upload {
  id: number;
  fileName: string;
  uploadedAt: Date;
  _count: { sales: number };
}

interface UploadSelectorProps {
  uploads: Upload[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function UploadSelector({ uploads, selectedId, onSelect }: UploadSelectorProps) {
  if (uploads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No uploads yet. Upload a file first.</p>
    );
  }

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-[320px]">
        <SelectValue placeholder="Select an upload" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Uploads (Global)</SelectItem>
        {uploads.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.fileName} ({u._count.sales} sales) - {new Date(u.uploadedAt).toLocaleDateString()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
