
import React from "react";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  delay?: number;
}

const TestimonialCard = ({ quote, author, role, delay = 0 }: TestimonialCardProps) => {
  return (
    <div 
      className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col animate-fade-up hover:shadow-md transition-shadow"
      style={{ animationDelay: `${delay}s` }}
    >
      <Quote className="h-6 w-6 text-finmate-500 mb-4" />
      <p className="text-gray-600 dark:text-gray-400 italic mb-6">{quote}</p>
      <div className="mt-auto">
        <p className="font-medium">{author}</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{role}</p>
      </div>
    </div>
  );
};

export default TestimonialCard;
