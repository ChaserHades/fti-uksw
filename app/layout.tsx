import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: { default: "Aset FTI UKSW", template: "%s | Aset FTI" },
  description: "Sistem Manajemen Aset Fakultas Teknologi Informasi UKSW",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1B263B",
              color: "#E0E1DD",
              border: "1px solid rgba(224,225,221,0.15)",
              borderRadius: "12px",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#7dd4a8", secondary: "#1B263B" } },
            error:   { iconTheme: { primary: "#f08070", secondary: "#1B263B" } },
          }}
        />
      </body>
    </html>
  );
}