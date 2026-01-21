'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Brain, Scroll, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-full z-50 flex flex-col border-r border-white/10 relative transition-all duration-300 bg-black/60 backdrop-blur-3xl',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 blur-3xl" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-black rounded-sm" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-white tracking-widest uppercase">
                Antigravity
              </h1>
              <p className="text-[10px] text-cyan-400/80 tracking-[0.2em] font-mono">
                SOVEREIGN V1
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-2 mt-4">
        <SidebarItem
          href="/"
          icon={<LayoutDashboard size={20} />}
          label="Command Center"
          pathname={pathname}
          collapsed={isCollapsed}
        />
        <SidebarItem
          href="/infrastructure"
          icon={<Server size={20} />}
          label="Infrastructure"
          pathname={pathname}
          collapsed={isCollapsed}
        />
        <SidebarItem
          href="/neural"
          icon={<Brain size={20} />}
          label="Neural Hub"
          pathname={pathname}
          collapsed={isCollapsed}
        />
        <SidebarItem
          href="/constitution"
          icon={<Scroll size={20} />}
          label="Constitution"
          pathname={pathname}
          collapsed={isCollapsed}
        />
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-black border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 hover:border-cyan-400/50 transition-all z-50"
      >
        <ChevronRight
          size={14}
          className={cn(
            'transition-transform duration-300 text-muted-foreground',
            isCollapsed ? '' : 'rotate-180'
          )}
        />
      </button>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black/40">
        <div
          className={cn(
            'flex items-center gap-3 text-xs font-mono transition-opacity duration-200',
            isCollapsed ? 'justify-center' : ''
          )}
        >
          <div className="relative shrink-0">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20" />
          </div>
          {!isCollapsed && (
            <span className="text-emerald-400/80 tracking-wider">SYSTEM OPTIMAL</span>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  pathname,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group overflow-hidden border border-transparent',
        isActive ? 'bg-white/5 border-white/10' : 'hover:bg-white/5 hover:border-white/5',
        collapsed ? 'justify-center' : ''
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_15px_cyan]" />
      )}

      <span
        className={cn(
          'relative z-10 transition-colors duration-300',
          isActive ? 'text-cyan-400' : 'text-muted-foreground group-hover:text-white'
        )}
      >
        {icon}
      </span>

      {!collapsed && (
        <span
          className={cn(
            'relative z-10 font-medium tracking-wide text-sm whitespace-nowrap transition-colors duration-300',
            isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white'
          )}
        >
          {label}
        </span>
      )}

      {isActive && !collapsed && (
        <motion.div
          layoutId="glow"
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
}
