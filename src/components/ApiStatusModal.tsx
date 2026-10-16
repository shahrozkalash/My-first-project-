import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  Code2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
  Film,
  Zap,
  Server,
  Terminal,
} from 'lucide-react';
import { Project, VideoEngineHealth } from '../types';
import { generateWanApiPayload, generateVeoApiPayload } from '../utils/storage';

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project;
}

export const ApiStatusModal: React.FC<ApiStatusModalProps> = ({
  isOpen,
  onClose,
  activeProject,
}) => {
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [wanHealth, setWanHealth] = useState<VideoEngineHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<'wan-engine' | 'comparison' | 'setup' | 'payload'>('wan-engine');

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/config/status');
      const data = await res.json();
      setConfigStatus(data);
      if (data.wanEngine) {
        setWanHealth(data.wanEngine);
      }
    } catch (e) {
      console.error('Failed to check API status:', e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Wan 2.1 Video Engine & Architecture
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-full">
                  Open-Source Diffusion
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Modular external inference server architecture for open-source Wan video models
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Wan Engine Health Status Strip */}
        <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                wanHealth?.reachable
                  ? 'bg-emerald-400 animate-pulse'
                  : wanHealth?.configured
                  ? 'bg-amber-400'
                  : 'bg-zinc-600'
              }`}
            />
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Wan Video Engine:</span>
                <span className="text-purple-300 font-mono">
                  {wanHealth?.model || 'wan-2.1-t2v-1.4b'}
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                {wanHealth?.message || 'Checking engine health...'}
              </p>
            </div>
          </div>

          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Probing...' : 'Refresh Engine'}</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('wan-engine')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'wan-engine'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Wan Engine Specs
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'setup'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            How to Connect Wan Server
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'comparison'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Architecture & Pipeline
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'payload'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Inference Payload Schema
          </button>
        </div>

        {/* Tab 1: Wan Engine Specs */}
        {activeTab === 'wan-engine' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Target Model Checkpoint
                </span>
                <p className="text-white font-mono font-semibold text-sm">
                  {wanHealth?.model || 'wan-2.1-t2v-1.4b'}
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Wan2.1 open-source diffusion model. Supports text-to-video (1.4B and 14B) and image-to-video (14B).
                </p>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Configured Endpoint
                </span>
                <p className="text-white font-mono text-xs truncate">
                  {wanHealth?.engineUrlDisplay || 'None'}
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Controlled by <code className="text-purple-300">WAN_ENGINE_URL</code> on the server. Never exposed to browser.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Backend Endpoints Implemented in StoryMotion AI</span>
              </h4>
              <ul className="space-y-1.5 font-mono text-[11px] text-zinc-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">GET</span>
                  <span className="text-purple-300">/api/video/engine/status</span>
                  <span className="text-zinc-500 font-sans">— Probes reachability and model metadata</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">POST</span>
                  <span className="text-purple-300">/api/video/engine/generate</span>
                  <span className="text-zinc-500 font-sans">— Dispatches prompt, camera, and character anchors</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">GET</span>
                  <span className="text-purple-300">/api/video/engine/job/:id</span>
                  <span className="text-zinc-500 font-sans">— Polls generation progress percentage</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">GET</span>
                  <span className="text-purple-300">/api/video/engine/video/:id</span>
                  <span className="text-zinc-500 font-sans">— Proxies generated MP4 stream to the preview player</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: How to Connect Wan */}
        {activeTab === 'setup' && (
          <div className="space-y-3.5 text-xs text-zinc-300">
            <p className="text-zinc-400">
              When you are ready to connect a real Wan GPU inference server later, here is the exact deployment procedure:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">1</span>
                  <span>Deploy Wan on a GPU Instance</span>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7 leading-relaxed">
                  Host the open-source Wan2.1 repository (e.g. on RunPod, Modal, Vast.ai, or a local RTX 4090 / A100 server) using the Hugging Face Diffusers pipeline or ComfyUI Wan wrapper.
                </p>
                <div className="pl-7 pt-1 font-mono text-[10px] text-zinc-400 bg-black/60 p-2 rounded border border-zinc-800">
                  pip install diffusers torch torchvision<br />
                  # Serve Wan2.1 text-to-video API at /v1/video/generations
                </div>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">2</span>
                  <span>Configure Environment Variable</span>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7 leading-relaxed">
                  In your deployment settings or <code>.env</code>, set:
                </p>
                <div className="pl-7 pt-1 font-mono text-[10px] text-purple-300 bg-black/60 p-2 rounded border border-zinc-800">
                  WAN_ENGINE_URL="https://your-gpu-worker-url.com"<br />
                  WAN_MODEL="wan-2.1-t2v-1.4b"<br />
                  WAN_ENGINE_API_KEY="your-optional-token"
                </div>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">3</span>
                  <span>Instant Studio Video Rendering</span>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7 leading-relaxed">
                  StoryMotion AI will automatically recognize the reachable server, stream progress bars into each scene card, and deliver the rendered MP4 into the player!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Architecture & Comparison */}
        {activeTab === 'comparison' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* StoryMotion AI Features */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <h4>StoryMotion AI Studio (Client & Applet)</h4>
                </div>
                <ul className="space-y-2 text-zinc-300 text-[11px]">
                  <li>✓ <strong>Story Ideation & Decomposition:</strong> Free Gemini 3.8 Flash model or heuristic director engine.</li>
                  <li>✓ <strong>Character Consistency Engine:</strong> Locks facial traits, wardrobe, and props across all scenes.</li>
                  <li>✓ <strong>Camera & Lighting Choreography:</strong> Pan, zoom, orbit, lighting setups per shot.</li>
                  <li>✓ <strong>16:9 & 9:16 Framing Viewport:</strong> Real-time shot scrubber and dialogue display.</li>
                  <li>✓ <strong>Local Draft Storage:</strong> Saved to localStorage.</li>
                  <li>✓ <strong>Batch Prompts & Script Export:</strong> 1-click Markdown, text, and JSON exports.</li>
                </ul>
              </div>

              {/* Wan Inference Server */}
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <h4>Wan 2.1 Inference Server (External GPU)</h4>
                </div>
                <ul className="space-y-2 text-zinc-300 text-[11px]">
                  <li>• <strong>Open-Source Video Diffusion:</strong> Generates multi-second MP4 video frames.</li>
                  <li>• <strong>Zero Commercial API Lock-In:</strong> No paid video SaaS accounts or credit cards required.</li>
                  <li>• <strong>Flexible Deployment:</strong> Self-host on your own hardware or pay-per-second GPU cloud.</li>
                  <li>• <strong>Honest Pipeline:</strong> App reports clear error when server is offline and never fakes video generation.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Payload */}
        {activeTab === 'payload' && (
          <div className="space-y-3 text-xs">
            <p className="text-zinc-400">
              The exact Wan 2.1 request payload ready for <code>/v1/video/generations</code>:
            </p>
            <pre className="p-3 bg-zinc-900 rounded-xl font-mono text-[11px] text-zinc-200 overflow-x-auto border border-zinc-800 max-h-60">
              {activeProject
                ? JSON.stringify(generateWanApiPayload(activeProject), null, 2)
                : '// No active project selected'}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
