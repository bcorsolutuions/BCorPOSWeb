import type { ReactNode } from "react";

// Next.js requires a root layout outside the [locale] segment; the real
// <html>/<body> tags are rendered one level down in app/[locale]/layout.tsx
// so we have access to the resolved locale/direction there.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
