import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function LogoUpload({ value, onChange }: LogoUploadProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }

      const { url } = await res.json();
      onChange(url);
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4 mt-1">
      {/* Preview */}
      <div className="w-16 h-16 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
        {value ? (
          <img src={value} alt="Business logo" className="w-full h-full object-cover" data-testid="img-logo-preview" />
        ) : (
          <ImageIcon className="w-7 h-7 text-gray-300 dark:text-gray-600" />
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          data-testid="input-logo-file"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          data-testid="button-upload-logo"
        >
          <Upload className="w-4 h-4 mr-1.5" />
          {uploading ? "Uploading..." : value ? "Change Logo" : "Upload Logo"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 h-7 px-2"
            onClick={() => onChange("")}
            data-testid="button-remove-logo"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG, GIF up to 5 MB</p>
      </div>
    </div>
  );
}
