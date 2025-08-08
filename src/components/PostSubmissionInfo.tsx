"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Loader2 } from "lucide-react";

interface PostSubmissionInfoProps {
  isSubmitting: boolean;
  // другие пропсы, если есть
}

const PostSubmissionInfo: React.FC<PostSubmissionInfoProps> = ({ isSubmitting }) => {
  return (
    <Card className="w-full bg-white/80 backdrop-blur-sm border-2 border-white/60">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-blue-700">
          Информация о получении
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Здесь остальное содержимое карточки */}
      </CardContent>
      {isSubmitting && (
        <div className="flex items-center justify-center space-x-2 border-t border-white/60 p-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
          <span className="text-blue-700 font-medium">ваша заявка обрабатывается</span>
        </div>
      )}
    </Card>
  );
};

export default PostSubmissionInfo;