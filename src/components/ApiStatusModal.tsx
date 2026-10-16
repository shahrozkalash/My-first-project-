import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  Code2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  Film,
  Zap,
  Server,
  Terminal,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { Project, VideoEngineHealth } from '../types';
import { generateWanApiPayload } from '../utils/storage';

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
  const [wanHealth, setWanHealth] = useState<VideoEngineHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'windows-setup' | 'hardware' | 'assembly' | 'payload'>('status');
  const [copiedBatch, setCopiedBatch] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/video/engine/status');
      const data = await res.json();
      setWanHealth(data);
    } catch (e: any) {
      setWanHealth({
        configured: true,
        reachable: false,
        engineType: 'wan',
        provider: 'local_hardware',
        engineUrlDisplay: 'http://127.0.0.1:8000',
        model: 'wan-2.1-t2v-1.4b',
        supportedModels: ['wan-2.1-t2v-1.4b (8GB-12GB VRAM)'],
        supportedResolutions: ['720p', '480p'],
        supportedAspectRatios: ['16:9', '9:16'],
        message: 'Could not connect to local backend. Make sure local_wan_server.py is running.',
        lastChecked: new Date().toISOString(),
        zeroCostGuaranteed: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const runLiveTest = async () => {
    setIsChecking(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/video/engine/test-connection', { method: 'POST' });
      const data = await res.json();
      setWanHealth(data);
      if (data.reachable) {
        setTestResult('Success: Local WAN 2.1 inference engine is reachable and ready to generate video clips on your GPU!');
      } else {
        setTestResult(`Offline: ${data.message}`);
      }
    } catch (e: any) {
      setTestResult(`Connection failed: ${e.message}. Launch scripts\\run_local_wan.bat on your Windows 11 machine.`);
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

  const copyBatchCmd = () => {
    navigator.clipboard.writeText('cd scripts && run_local_wan.bat');
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white">
                  Local WAN 2.1 Video Engine
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>100% Free & Zero-Cost</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Runs locally on your own computer with open-source WAN weights. Zero API fees or subscriptions.
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

        {/* Live Local WAN Engine Status Strip */}
        <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full ${
                wanHealth?.reachable
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <div>
              <div className="font-semibold text-white flex items-center gap-2">
                <span>Status:</span>
                <span className={wanHealth?.reachable ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                  {wanHealth?.reachable ? 'Online & Ready (Local GPU)' : 'Offline / Standby (Local PC)'}
                </span>
                <span className="text-purple-300 font-mono text-[11px] bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                  {wanHealth?.engineUrlDisplay || 'http://127.0.0.1:8000'}
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                {wanHealth?.message || 'Probing local inference server...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runLiveTest}
              disabled={isChecking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            testResult.startsWith('Success')
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-zinc-900/90 border-zinc-700 text-zinc-300'
          }`}>
            <Info className="w-4 h-4 shrink-0 text-purple-400" />
            <span>{testResult}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pb-1 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'status'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Zero-Cost Policy & Engine
          </button>
          <button
            onClick={() => setActiveTab('windows-setup')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'windows-setup'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Windows 11 Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'hardware'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Hardware & VRAM Check
          </button>
          <button
            onClick={() => setActiveTab('assembly')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'assembly'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Free Movie Assembly (FFmpeg)
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'payload'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Local JSON Payload
          </button>
        </div>

        {/* TAB 1: Status & Zero Cost Policy */}
        {activeTab === 'status' && (
          <div className="space-y-4 text-xs">
            {/* Zero Cost Guarantee Box */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Strict Zero-Cost Guarantee</span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                This project is architected to operate with <strong>absolutely zero spending</strong>:
              </p>
              <ul className="space-y-1 text-zinc-300 text-[11px] list-disc list-inside">
                <li>No paid cloud APIs (no subscriptions, no API key billing).</li>
                <li>Uses official open-source Wan 2.1 model weights (free from Hugging Face).</li>
                <li>Runs directly on your computer's own NVIDIA GPU.</li>
                <li>Free movie assembly via local FFmpeg without uploading to cloud servers.</li>
                <li>All planning features (story, scenes, character consistency) work 100% free with or without a GPU.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Target Open-Source Model
                </span>
                <p className="text-white font-mono font-semibold text-sm">
                  Wan-AI/Wan2.1-T2V-1.4B
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Alibaba's official open-source weights. Free download, runs on consumer NVIDIA GPUs with 8GB-12GB VRAM.
                </p>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Local Inference Address
                </span>
                <p className="text-white font-mono text-xs">
                  http://127.0.0.1:8000
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Default loopback address. No environment variables required; configure or pair directly in the Local Engine tab.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Windows 11 Free Setup Guide */}
        {activeTab === 'windows-setup' && (
          <div className="space-y-3.5 text-xs text-zinc-300">
            <p className="text-zinc-400">
              Follow these simple, completely free steps on your Windows 11 computer:
            </p>

            <div className="space-y-2.5">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <span>Install Python 3.10 or 3.11 (Free)</span>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7">
                  Download Python from <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer" className="text-purple-400 underline">python.org</a>. Make sure to check <strong>"Add python.exe to PATH"</strong> during installation.
                </p>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <span>Run the Local Server Script</span>
                  </div>
                  <button
                    onClick={copyBatchCmd}
                    className="text-[10px] text-purple-300 hover:text-white bg-purple-950/50 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    {copiedBatch ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBatch ? 'Copied' : 'Copy Command'}</span>
                  </button>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7">
                  Open Command Prompt or PowerShell in this project folder, and run:
                </p>
                <div className="ml-7 font-mono text-[11px] text-purple-300 bg-black/60 p-2.5 rounded border border-zinc-800 select-all">
                  python scripts/local_wan_server.py --port 8000 --model wan-2.1-t2v-1.4b --device cuda
                </div>
                <p className="text-zinc-500 text-[10px] pl-7">
                  Or on Windows, simply double-click <code className="text-zinc-300">scripts\run_local_wan.bat</code>!
                </p>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <span>Click "Generate Video" on Any Scene</span>
                </div>
                <p className="text-zinc-400 text-[11px] pl-7">
                  Once your local server is running on <code className="text-purple-300">http://127.0.0.1:8000</code>, return here and click <strong>Test Connection</strong>. The app will immediately dispatch scene generation to your local GPU!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Hardware & VRAM Guide */}
        {activeTab === 'hardware' && (
          <div className="space-y-3.5 text-xs text-zinc-300">
            <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span>NVIDIA GPU Hardware Tiers for Free Local Wan 2.1</span>
              </h4>
              <p className="text-zinc-400 text-[11px]">
                Wan 2.1 is an open-source diffusion foundation model family. Here is what your local hardware can run:
              </p>

              <div className="space-y-2 pt-1">
                <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-400">8GB - 12GB VRAM (Recommended Consumer GPUs)</span>
                    <p className="text-zinc-300 text-[11px] mt-0.5">
                      <strong>Cards:</strong> RTX 3060 (12GB), RTX 4060 (8GB/16GB), RTX 3070, RTX 4070
                    </p>
                    <p className="text-zinc-400 text-[10px]">
                      Runs <code className="text-purple-300">wan-2.1-t2v-1.4b</code> with FP16 precision and CPU offload enabled in Diffusers.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded shrink-0">
                    Optimal
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-purple-400">16GB - 24GB+ VRAM (High-End GPUs)</span>
                    <p className="text-zinc-300 text-[11px] mt-0.5">
                      <strong>Cards:</strong> RTX 3090 (24GB), RTX 4090 (24GB), RTX 4500 Ada
                    </p>
                    <p className="text-zinc-400 text-[10px]">
                      Can run both <code className="text-purple-300">wan-2.1-t2v-1.4b</code> and full <code className="text-purple-300">wan-2.1-t2v-14b</code> locally.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-500/40 rounded shrink-0">
                    Maximum Detail
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-zinc-300">Under 8GB VRAM / CPU Only</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Story generation, storyboard direction, character consistency, prompts, and FFmpeg assembly work 100% free with no GPU needed!
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-300 rounded shrink-0">
                    Storyboard Mode
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Free Movie Assembly (FFmpeg) */}
        {activeTab === 'assembly' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span>Zero-Cost Video Concatenation via FFmpeg</span>
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                When you have rendered scene clips locally on your PC, you can assemble them into one continuous movie (60s, 10m, or 30m) using FFmpeg completely free with zero re-encoding:
              </p>
              <div className="font-mono text-[10px] text-purple-300 bg-black/60 p-2.5 rounded border border-zinc-800 space-y-1 select-all">
                # 1. Create filelist.txt with your rendered clips:<br />
                file 'scene-1.mp4'<br />
                file 'scene-2.mp4'<br />
                file 'scene-3.mp4'<br />
                <br />
                # 2. Concat into a single MP4 with zero quality loss:<br />
                ffmpeg -f concat -safe 0 -i filelist.txt -c copy full_movie.mp4
              </div>
              <p className="text-zinc-500 text-[10px]">
                FFmpeg is 100% free open-source software (downloadable via <code className="text-zinc-300">winget install Gyan.FFmpeg</code> on Windows 11).
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: Payload Schema */}
        {activeTab === 'payload' && (
          <div className="space-y-3 text-xs">
            <p className="text-zinc-400">
              The exact local JSON payload dispatched to <code className="text-purple-300">/v1/video/generations</code>:
            </p>
            <pre className="p-3 bg-zinc-900 rounded-xl font-mono text-[11px] text-zinc-200 overflow-x-auto border border-zinc-800 max-h-60">
              {activeProject
                ? JSON.stringify(generateWanApiPayload(activeProject), null, 2)
                : '// No active project selected'}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-xs">
          <span className="text-emerald-400 text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero paid services guaranteed</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-600/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
