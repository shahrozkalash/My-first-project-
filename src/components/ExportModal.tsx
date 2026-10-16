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
  Video,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  Monitor,
  Zap,
  Play,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Project, VideoResolution } from '../types';
import {
  exportProjectJSON,
  exportStoryboardScript,
  exportVeoBatchPrompts,
  exportAudioScriptTimeline,
  downloadFile,
} from '../utils/storage';
import { formatDuration } from '../utils/duration';
import { VIDEO_RESOLUTIONS, getResolutionDimensions } from '../data/constants';
import { localHelperClient } from '../utils/localHelperClient';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject?: (updated: Project) => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
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
  onUpdateProject,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'project-exports' | 'video-assembly' | 'source-code'>('project-exports');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('server.ts');
  const [isLoadingSource, setIsLoadingSource] = useState(false);

  // Video assembly & verification state
  const [isAssembling, setIsAssembling] = useState(false);
  const [assembledMovie, setAssembledMovie] = useState<{
    filename: string;
    videoUrl: string;
    requestedResolution: string;
    actualDimensions: string;
    width: number;
    height: number;
    duration: number;
    isUpscaled: boolean;
    qualityNote: string;
    playbackVerified: boolean;
  } | null>(null);
  const [assemblyError, setAssemblyError] = useState<string | null>(null);

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
        <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('project-exports')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'project-exports'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Story & Video Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('video-assembly')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'video-assembly'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>MP4 Assembly & Video Export</span>
          </button>

          <button
            onClick={() => setActiveTab('source-code')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'source-code'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-400" />
            <span>Source Code Explorer</span>
          </button>
        </div>

        {/* TAB 1: STORY & PROMPT EXPORTS */}
        {activeTab === 'project-exports' && (
          <div className="space-y-2.5 text-xs overflow-y-auto pr-1">
            {/* 1. WAN & Open-Source Video Batch Prompts */}
            <div className="p-3.5 bg-zinc-900/80 border border-purple-500/30 rounded-xl space-y-2 hover:border-purple-500/60 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">
                    WAN 2.1 Sequential Batch Prompts (.txt)
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  Zero-Cost
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Ready-to-use prompts for each sequential scene, formatted with consistent character descriptions, camera movement directions, and aspect ratio flags.
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

            {/* 2.5 Audio Timeline & Voice Acting Script */}
            <div className="p-3.5 bg-zinc-900/80 border border-purple-500/30 rounded-xl space-y-2 hover:border-purple-500/60 transition-colors">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-white">
                  Audio & Voice Acting Timeline (.md)
                </span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Detailed sound-design cues, character voice profiles, timestamps, phoneme timing notes, and story-aware sound effect events.
              </p>
              <div className="pt-1">
                <button
                  onClick={() => exportAudioScriptTimeline(project)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg flex items-center gap-1.5 shadow-sm shadow-purple-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Audio Timeline (.md)</span>
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

        {/* TAB 2: MP4 VIDEO ASSEMBLY & EXPORT */}
        {activeTab === 'video-assembly' && (() => {
          const selectedResolution: VideoResolution = project.videoResolution || '720p';
          const dims = getResolutionDimensions(selectedResolution, project.aspectRatio);
          const activeResOpt = VIDEO_RESOLUTIONS.find((r) => r.id === selectedResolution) || VIDEO_RESOLUTIONS[1];

          const handleSelectQuality = (resId: VideoResolution) => {
            if (onUpdateProject) {
              onUpdateProject({
                ...project,
                videoResolution: resId,
              });
              onShowToast?.(`Export quality set to ${resId}`, 'info');
            }
          };

          const handleAssembleMovie = async () => {
            setIsAssembling(true);
            setAssemblyError(null);
            try {
              const res = await localHelperClient.assembleMovie({
                title: project.title,
                aspectRatio: project.aspectRatio,
                resolution: selectedResolution,
                scenes: project.scenes,
              });

              if (res && res.success && res.videoUrl) {
                setAssembledMovie(res);
                onShowToast?.(`Master MP4 assembled at ${res.actualDimensions || selectedResolution}!`, 'success');
              } else {
                setAssemblyError(
                  res?.message || res?.error || 'Failed to assemble master movie MP4 on local helper. Ensure windows-helper\\start.bat is running.'
                );
              }
            } catch (err: any) {
              setAssemblyError(
                `Local Windows Helper is offline: ${err.message || err}. Launch "windows-helper\\start.bat" on your Windows PC to assemble MP4s locally with zero cloud costs.`
              );
            } finally {
              setIsAssembling(false);
            }
          };

          return (
            <div className="space-y-3.5 text-xs overflow-y-auto pr-1">
              {/* Overview strip */}
              <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Movie Assembly & Video Quality Pipeline</h4>
                    <p className="text-[11px] text-zinc-400">
                      {project.scenes.length} Scenes · {formatDuration(project.scenes.reduce((acc, s) => acc + (s.duration || 0), 0))} Runtime · {project.aspectRatio === '16:9' ? '16:9 Landscape' : '9:16 Portrait'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {project.scenes.filter((s) => Boolean(s.videoUrl)).length} of {project.scenes.length} clips ready
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedResolution} ({dims.display})
                  </span>
                </div>
              </div>

              {/* 1. Video Quality Selector Setting (480p / 720p HD / 1080p Full HD) */}
              <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-white font-bold">Export Video Quality & Resolution</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ({project.aspectRatio === '9:16' ? 'Vertical 9:16' : 'Landscape 16:9'})
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    Applied consistently to every scene render and final movie assembly
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {VIDEO_RESOLUTIONS.map((resOpt) => {
                    const isSelected = selectedResolution === resOpt.id;
                    const resDimensions = project.aspectRatio === '9:16' ? resOpt.portraitDimensions : resOpt.landscapeDimensions;

                    return (
                      <button
                        key={resOpt.id}
                        type="button"
                        onClick={() => handleSelectQuality(resOpt.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? resOpt.id === '1080p'
                              ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-400 shadow-md shadow-purple-600/20'
                              : resOpt.id === '720p'
                              ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-400 shadow-md shadow-blue-600/20'
                              : 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-400 shadow-md shadow-emerald-600/20'
                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white tracking-tight">
                                {resOpt.label}
                              </span>
                              {resOpt.id === '720p' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                                  Default
                                </span>
                              )}
                              {resOpt.id === '480p' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                  Lower Resource
                                </span>
                              )}
                              {resOpt.id === '1080p' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                                  Full HD
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-zinc-200 font-bold block mt-0.5">
                              {resDimensions.display}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                          {resOpt.tagline}
                        </p>

                        <div className="mt-1.5 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                          <span>{resOpt.nativeWanSupport ? '✓ Native 720p' : '★ Lanczos Upscale'}</span>
                          <span className="text-zinc-400 font-medium">
                            {resOpt.resourceLevel === 'lower' ? 'Fast (~4GB)' : resOpt.resourceLevel === 'balanced' ? '8-12GB VRAM' : '12GB+ VRAM'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. One-Click Assemble & Verify Master Movie MP4 */}
              <div className="p-3.5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-semibold text-white flex items-center gap-1.5 text-xs">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Assemble Master Movie MP4 ({activeResOpt.label})</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Renders/scales all scenes to {dims.display}, synchronizes dialogue & sound effects, and verifies actual dimensions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAssembleMovie}
                    disabled={isAssembling || project.scenes.length === 0}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                      isAssembling
                        ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {isAssembling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                        <span>Assembling & Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Assemble & Verify MP4</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Assembly Error Notice */}
                {assemblyError && (
                  <div className="p-2.5 bg-red-950/30 border border-red-500/40 rounded-lg text-[11px] text-red-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Assembly Limitation Notice</span>
                    </div>
                    <p className="text-zinc-300">{assemblyError}</p>
                    <p className="text-[10px] text-zinc-400">
                      Tip: If 1080p upscaling is requested without FFmpeg, switch to 720p or 480p, or launch <code>windows-helper\start.bat</code>.
                    </p>
                  </div>
                )}

                {/* Assembled Movie Success & Verification Preview */}
                {assembledMovie && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-white text-xs">
                            Master MP4 Verified ({assembledMovie.actualDimensions})
                          </span>
                          <span className="text-[10px] text-emerald-300 ml-2 font-mono">
                            {assembledMovie.duration}s Runtime · {assembledMovie.playbackVerified ? '✓ Playback Verified' : 'Ready'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={assembledMovie.videoUrl}
                          download={assembledMovie.filename}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Master MP4</span>
                        </a>
                      </div>
                    </div>

                    {/* Honest Resolution & Upscaling Quality Note */}
                    <p className="text-[11px] text-zinc-300 bg-black/40 p-2 rounded-lg border border-emerald-500/20 font-mono">
                      {assembledMovie.qualityNote}
                    </p>

                    {/* Video Player */}
                    <div className="relative rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-video max-h-48 flex items-center justify-center">
                      <video
                        controls
                        src={assembledMovie.videoUrl}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Scene Clips Status */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Sequential Shot Assembly List ({project.scenes.length} Scenes)
                </span>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {project.scenes.map((scene) => {
                    const hasVideo = Boolean(scene.videoUrl);
                    return (
                      <div
                        key={scene.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          hasVideo
                            ? 'bg-zinc-900/90 border-emerald-500/40'
                            : 'bg-zinc-900/50 border-zinc-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-200 flex items-center justify-center shrink-0">
                            {scene.sceneNumber}
                          </span>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate text-xs">
                              {scene.title || `Shot ${scene.sceneNumber}`}
                            </p>
                            <p className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                              <span>{scene.duration}s</span>
                              <span>•</span>
                              <span className="truncate">{scene.cameraMovement}</span>
                              <span>•</span>
                              <span className="font-mono text-zinc-400">{dims.display}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasVideo ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Ready</span>
                              </span>
                              <a
                                href={scene.videoUrl}
                                download={`scene-${scene.sceneNumber}.mp4`}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>MP4</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                              Awaiting Render
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Video Stitching & FFmpeg Concat Script */}
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span>Manual Assembly Script ({selectedResolution} - {dims.display})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const filelistContent = project.scenes
                        .map((s, idx) => `file 'scene-${idx + 1}.mp4'`)
                        .join('\n');
                      downloadFile(filelistContent, 'filelist.txt', 'text/plain');
                    }}
                    className="text-[11px] text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 px-2 py-0.5 rounded transition-all"
                  >
                    Download filelist.txt
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  To stitch clips manually on your computer with FFmpeg at {dims.display} with full audio preservation:
                </p>
                <pre className="p-2 bg-black/60 rounded-lg text-[10px] font-mono text-purple-300 border border-zinc-800 overflow-x-auto select-all">
                  {selectedResolution === '1080p'
                    ? `ffmpeg -f concat -safe 0 -i filelist.txt -vf "scale=${dims.width}:${dims.height}:flags=lanczos,unsharp=5:5:0.5:5:5:0.0" -c:v libx264 -crf 18 -c:a aac -b:a 192k "${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedResolution}.mp4"`
                    : `ffmpeg -f concat -safe 0 -i filelist.txt -vf "scale=${dims.width}:${dims.height}:flags=lanczos" -c:v libx264 -crf 18 -c:a aac -b:a 192k "${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedResolution}.mp4"`}
                </pre>
              </div>

              {/* Strict Zero-Cost Local Engine Notice */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5 text-[11px] text-zinc-300">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Strict Zero-Cost Local Execution Guarantee</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  StoryMotion AI operates with <strong>zero paid services</strong>. All video diffusion happens on your own computer using open-source WAN weights:
                </p>
                <div className="font-mono text-[10px] text-zinc-300 bg-black/50 p-2 rounded border border-zinc-800/80 space-y-0.5">
                  <div><strong className="text-purple-400">Active Quality:</strong> {selectedResolution} ({dims.display})</div>
                  <div><strong className="text-purple-400">Resolution Handling:</strong> {activeResOpt.resourceDescription}</div>
                  <div><strong className="text-purple-400">WAN Inference:</strong> http://127.0.0.1:8000 (Local Python helper, zero cost)</div>
                  <div><strong className="text-emerald-400">Master Assembly:</strong> Free local FFmpeg concat & Lanczos scaling (zero fees)</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 3: IN-APP SOURCE CODE VIEWER & FILE EXPLORER */}
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
