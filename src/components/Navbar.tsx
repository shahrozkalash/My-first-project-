import React from 'react';
import {
  Film,
  Sparkles,
  FolderOpen,
  Download,
  Plus,
  Cpu,
  CheckCircle2,
  Share2,
  Volume2,
  Swords,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info';
  setCurrentTab: (tab: 'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info') => void;
  onNewProject: () => void;
  onOpenExportModal: () => void;
  onOpenFightPlanner?: () => void;
  projectCount: number;
  activeProjectTitle: string;
  isSaving?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onNewProject,
  onOpenExportModal,
  onOpenFightPlanner,
  projectCount,
  activeProjectTitle,
  isSaving,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('studio')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-[1px] shadow-lg shadow-purple-600/20 group-hover:shadow-purple-500/40 transition-all">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Film className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base tracking-tight text-white">
                  StoryMotion<span className="text-purple-400">AI</span>
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded">
                  Studio
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-[140px] sm:max-w-[200px] hidden xs:block">
                {activeProjectTitle || 'AI Video Story Studio'}
              </p>
            </div>
          </button>
        </div>

        {/* Center Navigation Tabs (Tablet & Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-1">
          <button
            onClick={() => setCurrentTab('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentTab === 'studio'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Story Studio
          </button>

          <button
            onClick={() => setCurrentTab('audio-studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentTab === 'audio-studio'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            Audio & Lip-Sync
          </button>

          <button
            onClick={() => setCurrentTab('projects')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentTab === 'projects'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Projects
            <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full bg-zinc-800 text-zinc-300">
              {projectCount}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('local-engine')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              currentTab === 'local-engine' || currentTab === 'api-info'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Local Engine
          </button>
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Auto-save status */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 mr-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSaving ? 'Saving draft...' : 'Draft saved locally'}</span>
          </div>

          {onOpenFightPlanner && (
            <button
              onClick={onOpenFightPlanner}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 rounded-lg transition-colors shadow-sm active:scale-95"
              title="Plan structured fight choreography"
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Fight Planner</span>
            </button>
          )}

          <button
            onClick={onNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg transition-colors active:scale-95"
            title="Create New Project"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">New Project</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg shadow-md shadow-purple-600/25 transition-all active:scale-95"
            title="Export Script & Video Prompts"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
