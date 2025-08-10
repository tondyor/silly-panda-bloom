"use client";

import React from "react";

interface ShellCardProps {
  className?: string;
  children: React.ReactNode;
}

export const ShellCard: React.FC<ShellCardProps> = ({ className = "", children }) => {
  return (
    <div className={`rounded-lg shadow-lg bg-brand-light p-6 ${className}`}>
      {children}
    </div>
  );
};

export default ShellCard;