import type { ReactNode } from "react";

export const metadata = { title: "Ping data test", description: "Design job postings and requirement extraction test" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 16px",
          lineHeight: 1.45,
          color: "#111",
          background: "#fff",
        }}
      >
        <style>{`
          table { border-collapse: collapse; width: 100%; font-size: 14px; }
          th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f4f4f4; }
          h2 { margin-top: 40px; border-bottom: 2px solid #111; padding-bottom: 4px; }
          .muted { color: #666; font-size: 13px; }
          .bar { background: #3b6fd8; height: 10px; display: inline-block; vertical-align: middle; margin-right: 6px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
          details pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; background: #fafafa; padding: 10px; max-height: 400px; overflow: auto; }
          form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0; }
          .tag { display: inline-block; background: #eef; border-radius: 3px; padding: 0 5px; margin: 1px; font-size: 12px; }
          .wrap { overflow-x: auto; }
          .tag-secondary { background: transparent; border: 1px solid #ccd; color: #555; font-size: 11px; }
        `}</style>
        {children}
      </body>
    </html>
  );
}
