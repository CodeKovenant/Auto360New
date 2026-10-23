import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  kind?: "logo" | "banner";
}

export default function LogoUpload({ value, onChange, kind = "logo" }: LogoUploadProps) {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isBanner = kind === "banner";
  const label = isBanner ? "Banner image" : "Logo";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image", description: "Upload a JPG, PNG, GIF, WebP, or another supported image file.", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: `${label} must be 5 MB or smaller.`, variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      toast({ title: "Sign in required", description: `Please sign in before uploading a ${label.toLowerCase()}.`, variant: "destructive" });
      if (user) {
        logout();
        navigate("/login");
      } else {
        navigate("/register");
      }
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(kind, file);

      const res = await fetch(`/api/upload/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        logout();
        navigate("/login");
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }

      const { url } = await res.json();
      onChange(url);
      toast({ title: `${label} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={`flex items-center gap-4 mt-1 ${isBanner ? "flex-col items-start sm:flex-row" : ""}`}>
      {/* Preview */}
      <div className={`${isBanner ? "w-full sm:w-64 h-24" : "w-16 h-16"} rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0`}>
        {value ? (
          <img src={value} alt={`Business ${label.toLowerCase()}`} className="w-full h-full object-cover" data-testid={`img-${kind}-preview`} />
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
          data-testid={`input-${kind}-file`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          data-testid={`button-upload-${kind}`}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          {uploading ? "Uploading..." : value ? `Change ${label}` : `Upload ${label}`}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 h-7 px-2"
            onClick={() => onChange("")}
            data-testid={`button-remove-${kind}`}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Remove
          </Button>
        )}
        {isBanner ? (
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Use a wide landscape image, ideally at least 1600 x 600 px. The profile header crops the image to fill, so keep the main subject near the center. Image files up to 5 MB.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Image files up to 5 MB</p>
        )}
      </div>
    </div>
  );
}
