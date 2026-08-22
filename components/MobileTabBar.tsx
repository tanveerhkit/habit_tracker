'use client';

import Link from 'next/link';
import { LayoutDashboard, Target, Timer } from 'lucide-react';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/timer', label: 'Focus timer', icon: Timer },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-3 pt-2 shadow-[0_-10px_30px_rgba(25,25,24,.08)] backdrop-blur-xl [padding-bottom:calc(.5rem+env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Mobile primary navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition active:scale-[.97] ${active ? 'bg-accent-soft text-accent-strong' : 'text-muted hover:bg-surface-muted hover:text-ink'}`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
