"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../layout";

export default function Header() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();
  const isTaskList = pathname === "/task-list";
  const linkHref = isTaskList ? "/" : "/task-list";
  const linkLabel = isTaskList ? "Timeline" : "Task List";
  return (
    <header className="w-full px-4 py-4 flex flex-col md:flex-row md:items-center bg-[#FFFFF8] dark:bg-gray-900 transition-colors duration-200">
      {/* Nav links – right on desktop, top on mobile */}
      <div className="flex justify-end gap-4 order-first md:order-2 md:ml-auto">
        <Link
          href={linkHref}
          className="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-green-900 dark:hover:bg-blue-700 hover:text-white hover:border-green-900 dark:hover:border-blue-700 rounded-md px-3 py-1 transition-colors duration-200 flex items-center justify-center"
        >
          {linkLabel}
        </Link>
        <button
          onClick={toggle}
          className="border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-green-900 dark:hover:bg-blue-700 hover:text-white hover:border-green-900 dark:hover:border-blue-700 rounded-md px-3 py-1 transition-colors duration-200 flex items-center justify-center"
          aria-label="Toggle dark mode"
        >
          {isDark ? "☀️" : "🌙"}
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
