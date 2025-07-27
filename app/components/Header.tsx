"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../layout";

export default function Header() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();
  const isTaskList = pathname === "/task-list";
  const linkHref = isTaskList ? "/" : "/task-list";
  const linkLabel = isTaskList ? "Home" : "Task List";
  return (
    <header className="w-full px-4 py-4 flex flex-col md:flex-row md:items-center bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      {/* Nav links – right on desktop, top on mobile */}
      <div className="flex justify-end gap-4 order-first md:order-2 md:ml-auto">
        <Link
          href={linkHref}
          className="text-gray-900 dark:text-gray-100 font-normal border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        >
          {linkLabel}
        </Link>
        <button
          onClick={toggle}
          className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 text-lg"
          aria-label="Toggle dark mode"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Title */}
      <Link
        href="/"
        className="text-center md:text-left text-2xl md:text-3xl font-normal mt-2 md:mt-0 order-none md:order-1 text-gray-900 dark:text-gray-100 transition-colors duration-200"
      >
        Smart Hierarchical Itimizer of Tasks
      </Link>
    </header>
  );
} 