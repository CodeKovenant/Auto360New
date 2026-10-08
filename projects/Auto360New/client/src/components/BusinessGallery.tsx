import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ImageIcon, Upload, X, ZoomIn, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GalleryImage } from "@shared/schema";

interface Props {
  entityType: "business" | "spare_part" | "garage_service" | "car";
  entityId: string;
  canManage?: boolean;
  title?: string;
}

export default function BusinessGallery({ entityType, entityId, canManage = false, title = "Photos" }: Props) {
  const { toast } = useToast();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const qKey = [`/api/gallery/${entityType}/${entityId}`];

  const { data: images, isLoading } = useQuery<GalleryImage[]>({ queryKey: qKey });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qKey });
      toast({ title: "Image removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (caption.trim()) formData.append("caption", caption.trim());
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/gallery/${entityType}/${entityId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: qKey });
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      toast({ title: "Image uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const hasImages = images && images.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title} {hasImages && `(${images.length})`}
          </h3>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Caption (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="h-8 text-xs w-36"
              data-testid="input-gallery-caption"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload-gallery"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              {uploading ? "Uploading…" : "Add Photo"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              data-testid="input-gallery-file"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : hasImages ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {images.map(img => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              data-testid={`gallery-img-${img.id}`}
            >
              <img
                src={img.url}
                alt={img.caption || "Gallery image"}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setLightbox(img.url)}
                  className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                  title="View full size"
                  data-testid={`button-view-gallery-${img.id}`}
                >
                  <ZoomIn className="w-3.5 h-3.5 text-gray-800" />
                </button>
                {canManage && (
                  <button
                    onClick={() => deleteMutation.mutate(img.id)}
                    disabled={deleteMutation.isPending}
                    className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Delete image"
                    data-testid={`button-delete-gallery-${img.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
              {img.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 text-white text-[10px] leading-tight truncate">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-dashed border-gray-300 dark:border-gray-700">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-muted-foreground">
            {canManage ? "No photos yet. Click 'Add Photo' to upload." : "No gallery photos yet."}
          </p>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          data-testid="gallery-lightbox"
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            onClick={() => setLightbox(null)}
            data-testid="button-close-lightbox"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
