import { Link } from "wouter";
import { Star, Quote } from "lucide-react";

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
  const initials = review.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5"
      data-testid={`review-card-${review.id}`}
    >
      {/* Quote icon */}
      <Quote className="w-6 h-6 text-gray-100 dark:text-gray-800 mb-2 -scale-x-100" />

      {/* Comment */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4">
        {review.comment}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-none">{review.name}</p>
            <StarRow rating={review.rating} />
          </div>
        </div>
        <div className="text-right">
          <Link href={`/business/${review.businessId}`}>
            <span className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold block truncate max-w-[120px]">
              {review.businessName}
            </span>
          </Link>
          {review.createdAt && (
            <span className="text-[10px] text-gray-400">
              {new Date(review.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
