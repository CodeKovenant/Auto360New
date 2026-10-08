import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({ rating, max = 5, size = "md", interactive = false, onChange }: StarRatingProps) {
  const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(i + 1)}
          className={cn("focus:outline-none", interactive ? "cursor-pointer" : "cursor-default")}
        >
          <Star
            className={cn(
              sizes[size],
              i < rating ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600"
            )}
          />
        </button>
      ))}
    </div>
  );
}
