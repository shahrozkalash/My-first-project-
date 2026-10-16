import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Film,
  Calendar,
  Clock,
  Copy,
  Trash2,
  Download,
  Upload,
  ArrowRight,
  Ratio,
  Users,
} from 'lucide-react';
import { Project, VisualStyle, AspectRatio } from '../types';
import { exportProjectJSON, exportStoryboardScript } from '../utils/storage';

interface ProjectsLibraryProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProject: (imported: Project) => void;
}

export const ProjectsLibrary: React.FC<ProjectsLibraryProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDuplicateProject,
  onDeleteProject,
  onImportProject,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const [selectedRatioFilter, setSelectedRatioFilter] = useState<string>('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genre && p.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStyle =
      selectedStyleFilter === 'all' || p.style === selectedStyleFilter;

    const matchesRatio =
      selectedRatioFilter === 'all' || p.aspectRatio === selectedRatioFilter;

    return matchesSearch && matchesStyle && matchesRatio;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content) as Project;
          if (parsed && parsed.title && Array.isArray(parsed.scenes)) {
            onImportProject({
              ...parsed,
              id: `proj-${Date.now()}`,
              updatedAt: new Date().toISOString(),
            });
          } else {
            alert('Invalid project JSON structure.');
          }
        } catch (err) {
          alert('Failed to parse project JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-zinc-950 to-blue-950/40 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Projects Library
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Manage your video storyboards, consistent character sheets, and exportable generation drafts
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="cursor-pointer px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={onNewProject}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, prompt, genre..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={selectedStyleFilter}
            onChange={(e) => setSelectedStyleFilter(e.target.value)}
            className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Visual Styles</option>
            <option value="cinematic">Cinematic</option>
            <option value="realistic-3d">Realistic 3D</option>
            <option value="anime">Anime</option>
            <option value="cartoon">Modern Cartoon</option>
            <option value="children-animation">Children's Animation</option>
          </select>

          <select
            value={selectedRatioFilter}
            onChange={(e) => setSelectedRatioFilter(e.target.value)}
            className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Aspect Ratios</option>
            <option value="16:9">16:9 Landscape</option>
            <option value="9:16">9:16 Portrait</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40 space-y-3">
          <FolderOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">No matching projects found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new video project to get started.
          </p>
          <button
            onClick={onNewProject}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const totalDuration = proj.scenes.reduce((acc, s) => acc + s.duration, 0);

            return (
              <div
                key={proj.id}
                className={`bg-zinc-950/90 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all group ${
                  isActive
                    ? 'border-purple-500 shadow-xl shadow-purple-600/10 ring-1 ring-purple-500/50'
                    : 'border-zinc-800/80 hover:border-zinc-700/90 hover:bg-zinc-900/50'
                }`}
              >
                {/* Header with Title and Badges */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                      {proj.style}
                    </span>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                      <Ratio className="w-3 h-3 text-blue-400" />
                      {proj.aspectRatio}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {proj.title}
                  </h3>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {proj.logline || proj.prompt}
                  </p>
                </div>

                {/* Metadata Row */}
                <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-[11px] text-zinc-400 font-mono">
                  <div className="flex items-center gap-1">
                    <Film className="w-3 h-3 text-blue-400" />
                    <span>{proj.scenes.length} Scenes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>~{totalDuration}s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span>{proj.characters.length} Cast</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateProject(proj.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Duplicate project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => exportStoryboardScript(proj)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 transition-colors"
                      title="Export screenplay script (.md)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                        : 'bg-zinc-900 hover:bg-purple-600/30 text-zinc-300 hover:text-white border border-zinc-700/80'
                    }`}
                  >
                    <span>{isActive ? 'Editing Now' : 'Open Studio'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
