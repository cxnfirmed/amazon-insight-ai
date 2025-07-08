
import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviewCount: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, reviewCount, className = '' }) => {
  const stars = [];
  
  for (let i = 1; i <= 5; i++) {
    const fillPercentage = Math.min(Math.max(rating - (i - 1), 0), 1);
    
    stars.push(
      <div key={i} className="relative inline-block">
        {/* Empty star background */}
        <Star className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="currentColor" />
        
        {/* Filled star overlay */}
        {fillPercentage > 0 && (
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${fillPercentage * 100}%` }}
          >
            <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {stars}
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
        {reviewCount.toLocaleString()}
      </span>
    </div>
  );
};
