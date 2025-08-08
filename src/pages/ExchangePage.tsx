"use client";

import React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import PostSubmissionInfo from "@/components/PostSubmissionInfo";
import { ExchangeSummary } from "@/components/ExchangeSummary";

const ExchangePage = () => {
  const exampleData = []; // Замените на реальные данные, если есть

  return (
    <div>
      <PostSubmissionInfo isSubmitting={false} />
      <ExchangeSummary data={exampleData} />
      <MadeWithDyad />
    </div>
  );
};

export default ExchangePage;