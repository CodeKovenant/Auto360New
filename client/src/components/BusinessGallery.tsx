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
  layout?: "grid" | "featured";
  initialImages?: string[];
}

type GalleryPhoto = {
  key: string;
  id?: string;
  url: string;
  caption?: string | null;
};

export default function BusinessGallery({
  entityType,
  entityId,
  canManage = false,
  title = "Photos",
  layout = "grid",
  initialImages = [],
}: Props) {
  const { toast } = useToast();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const qKey = ["/api/gallery/" + entityType + "/" + entityId];
  const { data: images, isLoading } = useQuery<GalleryImage[]>({ queryKey: qKey });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", "/api/gallery/" + id);
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
      const res = await fetch("/api/gallery/" + entityType + "/" + entityId, {
        method: "POST",
        headers: token ? { Authorization: "Bearer " + token } : {},
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

  const seenUrls = new Set<string>();
  const photos: GalleryPhoto[] = [
    ...initialImages.map((url, index) => ({ key: "listing-" + index, url, caption: null })),
    ...(images || []).map(image => ({ key: image.id, id: image.id, url: image.url, caption: image.caption })),
  ].filter(photo => {
    if (!photo.url || seenUrls.has(photo.url)) return false;
    seenUrls.add(photo.url);
    return true;
  });
  const hasImages = photos.length > 0;
  const activePhoto = photos.find(photo => photo.url === selectedUrl) || photos[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title} {hasImages && "(" + photos.length + ")"}
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
              {uploading ? "Uploading..." : "Add Photo"}
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

      {layout === "featured" ? (
        <div>
          {hasImages && activePhoto ? (
            <>
              <button
                type="button"
                className="group relative block w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 aspect-[16/9] max-h-[560px]"
                onClick={() => setLightbox(activePhoto.url)}
                aria-label="Open selected photo"
                data-testid="gallery-featured-image"
              >
                <img
                  src={activePhoto.url}
                  alt={activePhoto.caption || title + " photo"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  View full size
                </span>
              </button>
              {activePhoto.caption && (
                <p className="mt-2 text-sm text-muted-foreground">{activePhoto.caption}</p>
              )}
              {photos.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label={title + " thumbnails"}>
                  {photos.map((photo, index) => (
                    <div className="relative flex-shrink-0" key={photo.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedUrl(photo.url)}
                        aria-label={"Show photo " + (index + 1)}
                        aria-pressed={activePhoto.url === photo.url}
                        className={"h-16 w-20 sm:h-20 sm:w-28 overflow-hidden rounded-lg border-2 transition " + (activePhoto.url === photo.url ? "border-red-500 ring-2 ring-red-500/20" : "border-transparent opacity-75 hover:opacity-100")}
                        data-testid={"gallery-thumbnail-" + (index + 1)}
                      >
                        <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      </button>
                      {canManage && photo.id && (
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(photo.id!)}
                          disabled={deleteMutation.isPending}
                          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700 disabled:opacity-50"
                          aria-label="Delete photo " + (index + 1)
                          data-testid={"button-delete-gallery-" + photo.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : isLoading ? (
            <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          ) : (
            <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              <ImageIcon className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-muted-foreground">
                {canManage ? "No photos yet. Add photos to show this listing." : "No photos have been added yet."}
              </p>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : hasImages ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, index) => (
            <div
              key={photo.key}
              className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
              data-testid={"gallery-img-" + (photo.id || index)}
            >
              <img
                src={photo.url}
                alt={photo.caption || "Gallery image"}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setLightbox(photo.url)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 transition-colors hover:bg-white"
                  title="View full size"
                  data-testid={"button-view-gallery-" + (photo.id || index)}
                >
                  <ZoomIn className="h-3.5 w-3.5 text-gray-800" />
                </button>
                {canManage && photo.id && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(photo.id!)}
                    disabled={deleteMutation.isPending}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600/90 hover:bg-red-600"
                    title="Delete image"
                    data-testid={"button-delete-gallery-" + photo.id}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-1 text-[10px] leading-tight text-white">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-muted-foreground">
            {canManage ? "No photos yet. Click 'Add Photo' to upload." : "No gallery photos yet."}
          </p>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          data-testid="gallery-lightbox"
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            onClick={() => setLightbox(null)}
            aria-label="Close photo"
            data-testid="button-close-lightbox"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
