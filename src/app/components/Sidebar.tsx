import { NavLink } from 'react-router';
import { 
  Home, 
  Database, 
  Search, 
  Network, 
  FileText, 
  MessageSquare 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home, exact: true },
  { path: '/data-studio', label: 'Data Studio', icon: Database },
  { path: '/investigation', label: 'Investigation', icon: Search },
  { path: '/graph-analysis', label: 'Graph Analysis', icon: Network },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/ai-assistant', label: 'AI Assistant', icon: MessageSquare },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-[#1a3a2e] text-white flex flex-col">
      <div className="p-6 border-b border-[#2d5a45]">
        <h1 className="text-xl font-semibold">Research Intel</h1>
        <p className="text-sm text-[#a3c4b5] mt-1">Knowledge Platform</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-[#2d5a45] text-white'
                      : 'text-[#a3c4b5] hover:bg-[#234136] hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-[#2d5a45]">
        <div className="text-xs text-[#a3c4b5]">
          <div>Version 1.0.0</div>
          <div className="mt-1">© 2026 Research Intel</div>
        </div>
      </div>
    </aside>
  );
}