import { Link } from "wouter";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ReviewCardProps {
  review: {
    id: string;
    name: string;
    rating: number;
    comment: string;
    businessId: string;
    businessName: string;
    createdAt?: string | Date | null;
  };
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? "fill-orange-400 text-orange-400" : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`review-card-${review.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {review.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{review.name}</p>
              {review.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <StarRow rating={review.rating} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">{review.comment}</p>
            <Link href={`/business/${review.businessId}`}>
              <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5 block font-medium">
                {review.businessName}
              </span>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
