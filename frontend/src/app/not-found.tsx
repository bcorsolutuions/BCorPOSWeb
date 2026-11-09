import Link from "next/link";

// Next.js renders its internal `/_not-found` route through the root
// app/layout.tsx ALONE — it never reaches app/[locale]/layout.tsx, since
// that requires a matched [locale] segment. app/layout.tsx deliberately
// returns bare children (see that file) so [locale]/layout.tsx can own
// the single <html>/<body> for every real, locale-prefixed route; this
// file is the one other place in the tree that needs its own complete
// document, or Next throws "Missing <html> and <body> tags in the root
// layout" the moment this boundary actually renders (an unmatched path,
// a 404 before middleware's locale redirect applies, etc.).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Page not found</h1>
            <p style={{ color: "#666" }}>
              <Link href="/en/dashboard">Go to dashboard</Link>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
