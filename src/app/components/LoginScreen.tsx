"use client";

import { ReactNode } from "react";
import { signIn } from "next-auth/react";
import { AppIcon } from "./AppIcon";

export function LoginScreen(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-stone-50 px-4">
      <AppIcon size={72} />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900">Kids Chaperone Scheduler</h1>
        <p className="text-stone-600 mt-1">Sign in to manage activity assignments</p>
      </div>
      <button
        onClick={() => signIn("google")}
        className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all duration-200 shadow-sm"
      >
        Sign in with Google
      </button>
    </div>
  );
}
