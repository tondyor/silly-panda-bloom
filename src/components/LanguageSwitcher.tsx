"use client";

import React from "react";

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  return (
    <div className={`flex space-x-2 ${className}`}>
      <button className="text-blue-600 hover:text-blue-800 font-semibold">EN</button>
      <button className="text-blue-600 hover:text-blue-800 font-semibold">RU</button>
      {/* Add other languages if needed */}
    </div>
  );
};

export default LanguageSwitcher;