import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Code2,
  Copy,
  Check,
  X,
  Film,
  Sparkles,
  FolderTree,
  FileCode,
  FileBox,
  Eye,
} from 'lucide-react';
import { Project } from '../types';
import {
  exportProjectJSON,
  exportStoryboardScript,
  exportVeoBatchPrompts,
  downloadFile,
} from '../utils/storage';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

interface SourceFile {
  path: string;
  category: string;
  exists: boolean;
  content: string;
  size: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [activeTab, setActiveTab] = useState<'project-exports' | 'source-code'>('project-exports');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('server.ts');
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // Fetch all source code files when switching to source-code tab
  useEffect(() => {
    if (isOpen && activeTab === 'source-code' && sourceFiles.length === 0) {
      setIsLoadingSource(true);
      fetch('/api/source-code')
        .then((res) => res.json())
        .then((data) => {
          if (data.files) {
            setSourceFiles(data.files);
            if (!data.files.find((f: SourceFile) => f.path === selectedFilePath)) {
              setSelectedFilePath(data.files[0]?.path || 'server.ts');
            }
          }
        })
        .catch((e) => console.error('Failed to load source files:', e))
        .finally(() => setIsLoadingSource(false));
    }
  }, [isOpen, activeTab, sourceFiles.length, selectedFilePath]);

  if (!isOpen) return null;

  const handleCopyPrompts = () => {
    const lines = project.scenes.map(
      (s) => `[SCENE ${s.sceneNumber}: ${s.title.toUpperCase()}]\n${s.visualPrompt}\n`
    );
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedType('prompts');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyCurrentFile = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType('code-file');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadCurrentFile = (file: SourceFile) => {
    const filename = file.path.split('/').pop() || 'file.txt';
    downloadFile(file.content, filename, 'text/plain');
  };

  const handleDownloadAllSourceBundle = () => {
    const bundle: Record<string, string> = {};
    sourceFiles.forEach((f) => {
      bundle[f.path] = f.content;
    });
    downloadFile(
      JSON.stringify(bundle, null, 2),
      'storymotion-ai-full-source-bundle.json',
      'application/json'
    );
  };

  const selectedFile = sourceFiles.find((f) => f.path === selectedFilePath) || sourceFiles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl w-full ${activeTab === 'source-code' ? 'max-w-4xl' : 'max-w-xl'} p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[92vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Export & Source Code Hub
              </h3>
              <p className="text-[11px] text-zinc-400">
                "{project.title}" · Story Scripts, Video Prompts & Application Source Code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('project-exports')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'project-exports'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Story & Video Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('source-code')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'source-code'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-400" />
            <span>Application Source Code (22 Files)</span>
          </button>
        </div>

        {/* TAB 1: STORY & PROMPT EXPORTS */}
        {activeTab === 'project-exports' && (
          <div className="space-y-2.5 text-xs overflow-y-auto pr-1">
            {/* 1. Veo & AI Video Batch Prompts */}
            <div className="p-3.5 bg-zinc-900/80 border border-purple-500/30 rounded-xl space-y-2 hover:border-purple-500/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">
                    Veo / Runway / Sora Batch Prompts (.txt)
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/40">
                  Recommended
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Ready-to-use prompts for each sequential scene, formatted with consistent character descriptions, camera path tags, and aspect ratio flags.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => exportVeoBatchPrompts(project)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg flex items-center gap-1.5 shadow-sm shadow-purple-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
                <button
                  onClick={handleCopyPrompts}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 border border-zinc-700"
                >
                  {copiedType === 'prompts' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All Prompts</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Screenplay Markdown */}
            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">
                  Screenplay & Storyboard Script (.md)
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Comprehensive cinematic document including logline, character consistency sheets, dialogue lines, lighting setups, and camera directions.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => exportStoryboardScript(project)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Markdown (.md)</span>
                </button>
              </div>
            </div>

            {/* 3. Project JSON */}
            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">
                  StoryMotion Project JSON (.json)
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Full project backup that can be imported back into StoryMotion AI or parsed by backend render workers.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => exportProjectJSON(project)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .json</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 border border-zinc-700"
                >
                  {copiedType === 'json' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IN-APP SOURCE CODE VIEWER & FILE EXPLORER */}
        {activeTab === 'source-code' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <p className="text-zinc-400">
                Browse and copy all live application files (frontend, backend, types, configuration):
              </p>
              <button
                onClick={handleDownloadAllSourceBundle}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg flex items-center gap-1.5 shadow-sm text-xs font-semibold"
              >
                <FileBox className="w-3.5 h-3.5" />
                <span>Download All Files (.json bundle)</span>
              </button>
            </div>

            {isLoadingSource ? (
              <div className="flex items-center justify-center p-12 text-zinc-400">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                <span>Loading source files...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 flex-1 min-h-[360px] overflow-hidden">
                {/* File Tree / List (4 cols) */}
                <div className="md:col-span-4 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 overflow-y-auto max-h-[440px] space-y-2 text-xs">
                  {['Backend Server', 'Frontend Core', 'UI Components', 'Types & Models', 'Constants & Demos', 'Storage & Exports', 'Config & Dependencies'].map(
                    (category) => {
                      const filesInCategory = sourceFiles.filter((f) => f.category === category);
                      if (filesInCategory.length === 0) return null;

                      return (
                        <div key={category} className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-1.5">
                            {category}
                          </span>
                          <div className="space-y-0.5">
                            {filesInCategory.map((file) => {
                              const isSelected = selectedFilePath === file.path;
                              return (
                                <button
                                  key={file.path}
                                  onClick={() => setSelectedFilePath(file.path)}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                                  }`}
                                >
                                  <span className="truncate">{file.path}</span>
                                  <span className="text-[9px] text-zinc-500 shrink-0 ml-1">
                                    {(file.size / 1024).toFixed(1)}k
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* File Viewer & Code Actions (8 cols) */}
                <div className="md:col-span-8 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
                  {selectedFile ? (
                    <>
                      {/* File Header Bar */}
                      <div className="p-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono text-xs text-white font-semibold">
                            {selectedFile.path}
                          </span>
                          <span className="text-[10px] text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700">
                            {selectedFile.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyCurrentFile(selectedFile.content)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs flex items-center gap-1 transition-colors"
                          >
                            {copiedType === 'code-file' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadCurrentFile(selectedFile)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs flex items-center gap-1 transition-colors"
                            title="Download this file"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      {/* Code Content */}
                      <pre className="p-3 font-mono text-[11px] text-zinc-300 overflow-auto flex-1 leading-relaxed bg-zinc-950 select-text">
                        <code>{selectedFile.content}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-8 text-zinc-500 text-xs">
                      Select a file on the left to view its contents.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end shrink-0 border-t border-zinc-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
