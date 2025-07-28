import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";
import { ThemeProvider } from "./contexts/ThemeContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const etBook = localFont({
  src: "./fonts/et-book-bold-line-figures.woff",
  variable: "--font-et-book",
  weight: "400",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${etBook.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-[#FFFFF8] dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200`}
      >
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
