import { useRef, useState } from "react";
import { Camera, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ListingImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function ListingImageUpload({ value, onChange, label = "Listing image", onUploadingChange }: ListingImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Upload failed", description: "Images must be 5 MB or smaller.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/upload/listing-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Image upload failed");
      onChange(result.url);
      toast({ title: "Image ready" });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Image upload failed", variant: "destructive" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium">{label} (optional)</span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
          <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={`Change ${label.toLowerCase()}`}>
              <Camera className="mr-1 h-4 w-4" />{uploading ? "Uploading..." : "Change"}
            </Button>
            <Button type="button" size="icon" variant="destructive" onClick={() => onChange("")} aria-label={`Remove ${label.toLowerCase()}`}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex h-32 w-full max-w-xs flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-500 dark:border-gray-600 dark:text-gray-400" aria-label={`Upload ${label.toLowerCase()}`}>
          <ImageIcon className="mb-2 h-7 w-7 opacity-50" />
          <span className="text-xs font-medium">{uploading ? "Uploading..." : "Choose image"}</span>
          <span className="mt-0.5 text-xs opacity-60">JPG, PNG, GIF up to 5 MB</span>
        </button>
      )}
    </div>
  );
}