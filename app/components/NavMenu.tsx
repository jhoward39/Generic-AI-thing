"use client";

import { useState } from "react";
import Link from "next/link";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        aria-label="Toggle navigation menu"
        onClick={() => setOpen((p) => !p)}
        className="p-4 focus:outline-none"
      >
        <div className="w-6 h-0.5 bg-black mb-1" />
        <div className="w-6 h-0.5 bg-black mb-1" />
        <div className="w-6 h-0.5 bg-black" />
      </button>

      {/* Overlay menu */}
      <div
        className={`fixed top-0 left-0 h-full w-60 transform transition-transform duration-300 z-50 bg-[#FFFFF8] shadow-md ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col p-6 space-y-4">
          <Link href="/" onClick={() => setOpen(false)} className="text-black font-normal">
            Home
          </Link>
          <Link href="/task-list" onClick={() => setOpen(false)} className="text-black font-normal">
            Task List
          </Link>
        </div>
      </div>
    </>
  );
}
