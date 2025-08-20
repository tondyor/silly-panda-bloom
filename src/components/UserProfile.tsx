import React from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export const UserProfile = () => {
  const { data, isLoading } = useTelegram();
  const user = data?.user;

  if (isLoading || !user) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="h-12 flex flex-col justify-center space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');

  return (
    <div className="flex items-center space-x-2">
      <Avatar className="h-12 w-12 border-2 border-white/50">
        <AvatarImage src={user.photo_url} alt={fullName} />
        <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
      </Avatar>
      <div className="h-12 flex flex-col justify-center text-left">
        <p className="text-lg font-bold leading-tight text-white">{fullName}</p>
        {user.username && (
          <p className="text-lg font-bold leading-tight text-white/80">@{user.username}</p>
        )}
      </div>
    </div>
  );
};