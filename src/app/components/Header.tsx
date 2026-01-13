"use client";

import { ReactNode } from "react";
import { AppIcon } from "./AppIcon";

interface HeaderProps {
  userEmail: string | null | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function Header({
  userEmail,
  isLoading,
  onRefresh,
  onSignOut,
}: HeaderProps): ReactNode {
  return (
    <header className="bg-white border-b border-stone-200 px-4 py-3 sm:py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AppIcon size={28} />
            <h1 className="text-lg sm:text-xl font-bold text-stone-900">Kids Chaperone Scheduler</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-sm">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-orange-600 hover:text-orange-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <span className="text-stone-600 truncate max-w-32 sm:max-w-none">{userEmail}</span>
            <button
              onClick={onSignOut}
              className="text-stone-700 hover:text-stone-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
