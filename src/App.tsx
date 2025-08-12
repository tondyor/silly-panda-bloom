import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import React, { Suspense } from "react";

const ExchangePage = React.lazy(() => import("./pages/ExchangePage"));

const App = () => (
  <TooltipProvider>
    <Sonner />
    <BrowserRouter>
      <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<ExchangePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;