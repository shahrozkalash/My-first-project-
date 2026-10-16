import React from 'react';
import {
  Sparkles,
  Users,
  Clapperboard,
  PlaySquare,
  FolderOpen,
  Cpu,
  Volume2,
} from 'lucide-react';

export type MobileStudioSection = 'prompt' | 'characters' | 'scenes' | 'preview';

interface MobileBottomNavProps {
  currentTab: 'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info';
  setCurrentTab: (tab: 'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info') => void;
  studioSection: MobileStudioSection;
  setStudioSection: (sec: MobileStudioSection) => void;
  sceneCount: number;
  characterCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  studioSection,
  setStudioSection,
  sceneCount,
  characterCount,
}) => {
  const handleNav = (tab: 'studio' | 'audio-studio' | 'projects' | 'local-engine' | 'api-info', section?: MobileStudioSection) => {
    setCurrentTab(tab);
    if (section) {
      setStudioSection(section);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-1 flex items-center justify-around safe-area-bottom">
      {/* 1. Prompt & Story */}
      <button
        onClick={() => handleNav('studio', 'prompt')}
        className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2.5 rounded-lg transition-all active:scale-95 ${
          currentTab === 'studio' && studioSection === 'prompt'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Sparkles className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Story Idea</span>
      </button>

      {/* 2. Consistent Characters */}
      <button
        onClick={() => handleNav('studio', 'characters')}
        className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-2.5 rounded-lg transition-all active:scale-95 ${
          currentTab === 'studio' && studioSection === 'characters'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Users className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Characters</span>
        {characterCount > 0 && (
          <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-purple-600 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
            {characterCount}
          </span>
        )}
      </button>

      {/* 3. Sequential Scenes */}
      <button
        onClick={() => handleNav('studio', 'scenes')}
        className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 px-2.5 rounded-lg transition-all active:scale-95 ${
          currentTab === 'studio' && studioSection === 'scenes'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Clapperboard className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Scenes</span>
        {sceneCount > 0 && (
          <span className="absolute top-1 right-2 w-3.5 h-3.5 bg-blue-600 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
            {sceneCount}
          </span>
        )}
      </button>

      {/* 4. Preview Viewport */}
      <button
        onClick={() => handleNav('studio', 'preview')}
        className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2.5 rounded-lg transition-all active:scale-95 ${
          currentTab === 'studio' && studioSection === 'preview'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <PlaySquare className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Preview</span>
      </button>

      {/* 5. Audio & Lip-Sync Studio */}
      <button
        onClick={() => handleNav('audio-studio')}
        className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-lg transition-all active:scale-95 ${
          currentTab === 'audio-studio'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Volume2 className="w-4 h-4 mb-0.5 text-purple-400" />
        <span className="text-[10px]">Audio</span>
      </button>

      {/* 6. Projects Library */}
      <button
        onClick={() => handleNav('projects')}
        className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-lg transition-all active:scale-95 ${
          currentTab === 'projects'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <FolderOpen className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Projects</span>
      </button>

      {/* 6. Local Engine */}
      <button
        onClick={() => handleNav('local-engine')}
        className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-2 rounded-lg transition-all active:scale-95 ${
          currentTab === 'local-engine'
            ? 'text-purple-400 font-semibold'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Cpu className="w-4 h-4 mb-0.5" />
        <span className="text-[10px]">Local Engine</span>
      </button>
    </div>
  );
};
