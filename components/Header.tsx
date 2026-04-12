"use client";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-light tracking-[0.2em] text-[#1C3557]">
          株式会社竹谷商事
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/products" className="text-sm tracking-widest uppercase text-gray-500 hover:text-[#1C3557] transition-colors">
            All
          </Link>
          <Link href="/products?category=識別テープ" className="text-sm tracking-wide text-gray-500 hover:text-[#1C3557] transition-colors">
            識別テープ
          </Link>
          <Link href="/products?category=斜線テープ" className="text-sm tracking-wide text-gray-500 hover:text-[#1C3557] transition-colors">
            斜線テープ
          </Link>
          <Link href="/products?category=ナンバーテープ" className="text-sm tracking-wide text-gray-500 hover:text-[#1C3557] transition-colors">
            ナンバーテープ
          </Link>
          <Link href="/contact" className="text-sm tracking-wide text-gray-500 hover:text-[#1C3557] transition-colors">
            お問い合わせ
          </Link>
          <Link href="/order" className="text-sm tracking-widest uppercase px-4 py-2 bg-[#E07B2A] text-white hover:bg-[#c96e22] transition-colors">
            発注する
          </Link>
          <Link href="/login" className="text-xs text-gray-400 hover:text-[#1C3557] transition-colors">
            ログイン
          </Link>
        </nav>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="メニュー"
        >
          <span className={`block w-5 h-px bg-[#1C3557] transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-px bg-[#1C3557] transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-px bg-[#1C3557] transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4">
          <Link href="/products" onClick={() => setMenuOpen(false)} className="text-sm tracking-widest uppercase text-gray-500 hover:text-[#1C3557] transition-colors py-2">
            すべての商品
          </Link>
          <Link href="/products?category=識別テープ" onClick={() => setMenuOpen(false)} className="text-sm text-gray-500 hover:text-[#1C3557] transition-colors py-2">
            識別テープ
          </Link>
          <Link href="/products?category=斜線テープ" onClick={() => setMenuOpen(false)} className="text-sm text-gray-500 hover:text-[#1C3557] transition-colors py-2">
            斜線テープ
          </Link>
          <Link href="/products?category=ナンバーテープ" onClick={() => setMenuOpen(false)} className="text-sm text-gray-500 hover:text-[#1C3557] transition-colors py-2">
            ナンバーテープ
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)} className="text-sm text-gray-500 hover:text-[#1C3557] transition-colors py-2">
            お問い合わせ
          </Link>
          <Link href="/order" onClick={() => setMenuOpen(false)} className="text-sm tracking-widest uppercase px-4 py-3 bg-[#E07B2A] text-white text-center">
            発注する
          </Link>
          <Link href="/login" onClick={() => setMenuOpen(false)} className="text-xs text-gray-400 hover:text-[#1C3557] transition-colors py-2">
            ログイン
          </Link>
        </nav>
      )}
    </header>
  );
}
