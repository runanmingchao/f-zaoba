"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.9rem",
      }}
      toastOptions={{
        style: {
          background: "var(--bg-card)",
          color: "var(--text)",
          border: "1px solid var(--border)",
        },
      }}
    />
  );
}
