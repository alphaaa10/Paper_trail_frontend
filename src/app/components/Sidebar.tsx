import { NavLink } from 'react-router';
import {
  Home,
  Database,
  Search,
  Network,
  FileText,
  MessageSquare,
  Clock3,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home, exact: true },
  { path: '/data-studio', label: 'Data Studio', icon: Database },
  { path: '/investigation', label: 'Investigation', icon: Search },
  { path: '/graph-analysis', label: 'Knowledge Graph', icon: Network },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  { path: '/timeline', label: 'Timeline', icon: Clock3 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Sidebar({ collapsed, onToggleSidebar }: SidebarProps) {
  return (
    <>
      <aside
        className={`hidden md:flex md:flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`h-16 border-b border-sidebar-border flex items-center ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-base font-semibold tracking-wide">Paper Trail</h1>
              <p className="text-xs text-muted-foreground">Dark Khaki Console</p>
            </div>
          )}
          {collapsed && (
            <svg
              viewBox="0 0 96 96"
              className="w-8 h-8 text-primary/80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M24 14H58L72 28V82H24V14Z" stroke="currentColor" strokeWidth="6" />
              <path d="M58 14V28H72" stroke="currentColor" strokeWidth="6" />
              <path d="M34 44H62" stroke="currentColor" strokeWidth="6" />
              <path d="M34 58H56" stroke="currentColor" strokeWidth="6" />
            </svg>
          )}
        </div>

        <nav className="py-3 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.exact}
                  title={item.label}
                  className={({ isActive }) =>
                    `group flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 h-11 px-3 border ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1" />

        <div className="px-3 py-3 border-t border-sidebar-border flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{!collapsed ? 'v2.0 Khaki' : 'v2'}</span>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:inline-flex p-2 border border-sidebar-border bg-sidebar-accent hover:bg-primary/15 text-sidebar-foreground"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-sidebar-border bg-sidebar/95 backdrop-blur">
        <ul className="grid grid-cols-6">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `h-14 flex items-center justify-center border-r last:border-r-0 border-sidebar-border ${
                    isActive ? 'text-primary bg-primary/10' : 'text-sidebar-foreground'
                  }`
                }
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
