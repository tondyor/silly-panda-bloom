import React from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export const UserProfile = () => {
  const { data, isLoading } = useTelegram();
  const user = data?.user;

  if (isLoading || !user) {
    return (
      <div className="flex items-center space-x-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
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
    <div className="flex items-center space-x-3">
      <Avatar className="h-14 w-14 border-2 border-white/50">
        <AvatarImage src={user.photo_url} alt={fullName} />
        <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
      </Avatar>
      <div className="text-left">
        <p className="text-sm font-semibold leading-tight text-white">{fullName}</p>
        {user.username && (
          <p className="text-xs leading-tight text-white/80">@{user.username}</p>
        )}
      </div>
    </div>
  );
};