"use client";

import { ReactNode } from "react";

export function LoadingScreen(): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-50">
      <p className="text-stone-600">Loading...</p>
    </div>
  );
}
