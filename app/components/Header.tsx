"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Header() {
  const pathname = usePathname();
  const isTaskList = pathname === "/task-list";
  const linkHref = isTaskList ? "/" : "/task-list";
  const linkLabel = isTaskList ? "Home" : "Task List";
  return (
    <header className="w-full px-4 py-4 flex flex-col md:flex-row md:items-center">
      {/* Nav links – right on desktop, top on mobile */}
      <div className="flex justify-end gap-4 order-first md:order-2 md:ml-auto">
        <Link
          href={linkHref}
          className="text-black font-normal border border-gray-300 rounded-md px-3 py-1"
        >
          {linkLabel}
        </Link>
      </div>

      {/* Title */}
      <Link
        href="/"
        className="text-center md:text-left text-2xl md:text-3xl font-normal mt-2 md:mt-0 order-none md:order-1"
      >
        Smart Hierarchical Itimizer of Tasks
      </Link>
    </header>
  );
} 