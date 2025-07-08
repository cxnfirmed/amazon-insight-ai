
import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  showText?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  reviewCount, 
  showText = true, 
  size = 16 
}) => {
  const fullStars = Math.floor(rating);
  const partialFill = rating - fullStars;
  const emptyStars = 5 - Math.ceil(rating);

  const renderStar = (index: number) => {
    const isFullStar = index < fullStars;
    const isPartialStar = index === fullStars && partialFill > 0;
    
    if (isFullStar) {
      return (
        <Star 
          key={index} 
          size={size} 
          className="text-yellow-400 fill-yellow-400" 
        />
      );
    } else if (isPartialStar) {
      const fillPercentage = partialFill * 100;
      return (
        <div key={index} className="relative inline-block">
          <Star size={size} className="text-gray-300" />
          <div 
            className="absolute top-0 left-0 overflow-hidden"
            style={{ width: `${fillPercentage}%` }}
          >
            <Star size={size} className="text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      );
    } else {
      return (
        <Star 
          key={index} 
          size={size} 
          className="text-gray-300" 
        />
      );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
      </div>
      {showText && (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {rating.toFixed(1)}
          {reviewCount && (
            <span> · {reviewCount.toLocaleString()} reviews</span>
          )}
        </span>
      )}
    </div>
  );
};
