import { useRef, useState } from "react";
import { Camera, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PartImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function PartImageUpload({ value, onChange }: PartImageUploadProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5 MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload/part-image", {
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
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-testid="input-part-image-file"
      />

      {value ? (
        <div className="relative rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 w-full max-w-xs">
          <img src={value} alt="Part preview" className="w-full h-40 object-cover" data-testid="img-part-preview" />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs shadow"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="button-change-part-image"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              {uploading ? "Uploading..." : "Change"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="h-7 w-7 p-0 shadow"
              onClick={() => onChange("")}
              data-testid="button-remove-part-image"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          data-testid="button-upload-part-image"
        >
          <ImageIcon className="w-7 h-7 mb-2 opacity-50" />
          <span className="text-xs font-medium">{uploading ? "Uploading..." : "Click to upload image"}</span>
          <span className="text-xs opacity-60 mt-0.5">JPG, PNG, GIF up to 5 MB</span>
        </button>
      )}
    </div>
  );
}
