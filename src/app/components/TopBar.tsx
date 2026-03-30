import { Bell, Settings, User } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function TopBar() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <StatusBadge status="healthy" />
        <div className="text-sm text-gray-600">
          Workspace: <span className="font-medium text-gray-900">Production</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <button className="p-2 hover:bg-gray-100 transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-[#1a3a2e] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">Dr. Sarah Chen</div>
            <div className="text-gray-500 text-xs">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}