import React, { useState } from 'react';
import {
  Users,
  Plus,
  ShieldCheck,
  Edit2,
  Trash2,
  Sparkles,
  Check,
  X,
  Info,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { Character } from '../types';

interface CharacterConsistencyManagerProps {
  characters: Character[];
  onAddCharacter: (character: Character) => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onApplyToAllScenes: () => void;
}

export const CharacterConsistencyManager: React.FC<CharacterConsistencyManagerProps> = ({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onApplyToAllScenes,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [attire, setAttire] = useState('');
  const [keyProps, setKeyProps] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const openAddModal = () => {
    setEditingChar(null);
    setName('');
    setRole('Protagonist');
    setVisualDescription('');
    setAttire('');
    setKeyProps('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (char: Character) => {
    setEditingChar(char);
    setName(char.name);
    setRole(char.role);
    setVisualDescription(char.visualDescription);
    setAttire(char.attire);
    setKeyProps(char.keyProps);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Character name is required');
      return;
    }
    if (!visualDescription.trim()) {
      setErrorMsg('Visual appearance details are required to maintain AI consistency');
      return;
    }

    if (editingChar) {
      onUpdateCharacter({
        ...editingChar,
        name: name.trim(),
        role: role.trim() || 'Character',
        visualDescription: visualDescription.trim(),
        attire: attire.trim() || 'Consistent signature wardrobe',
        keyProps: keyProps.trim() || 'None',
      });
    } else {
      const colors = [
        'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'bg-pink-500/20 text-pink-400 border-pink-500/30',
      ];
      const randomColor = colors[characters.length % colors.length];

      onAddCharacter({
        id: `char-${Date.now()}`,
        name: name.trim(),
        role: role.trim() || 'Character',
        visualDescription: visualDescription.trim(),
        attire: attire.trim() || 'Consistent signature wardrobe',
        keyProps: keyProps.trim() || 'None',
        avatarBg: randomColor,
      });
    }

    setIsModalOpen(false);
  };

  const handleApplyClick = () => {
    onApplyToAllScenes();
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 3000);
  };

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-display">
                Character Consistency Engine
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                Active Anchor
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Locks identity, face structure, wardrobe, and props across all scenes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {characters.length > 0 && (
            <button
              onClick={handleApplyClick}
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 px-3 py-1.5 rounded-xl transition-all active:scale-95"
              title="Refresh character prompts into all scenes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync with All Scenes</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-xl transition-all shadow-md shadow-purple-600/30 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Character</span>
          </button>
        </div>
      </div>

      {/* Applied Toast */}
      {showAppliedToast && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Character descriptions synchronized into all scene prompts!</span>
        </div>
      )}

      {/* Educational info card */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-zinc-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          Generative video models (Google Veo, Sora, Runway) require explicit physical anchors in every prompt to prevent faces and clothing from morphing between cuts. StoryMotion automatically embeds your character profiles into each sequential shot.
        </p>
      </div>

      {/* Character Cards List */}
      {characters.length === 0 ? (
        <div className="text-center py-6 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 space-y-2">
          <Users className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">No characters added yet</p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
            Add a main character or click "Generate Story" above to have AI create consistent characters automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {characters.map((char) => (
            <div
              key={char.id}
              className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-3.5 space-y-2.5 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm border ${
                      char.avatarBg || 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {char.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {char.name}
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {char.role}
                      </span>
                    </h4>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Tag className="w-2.5 h-2.5 text-purple-400" />
                      Locked Profile
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(char)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Edit character"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteCharacter(char.id)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    title="Delete character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Character consistency traits */}
              <div className="space-y-1.5 text-[11px] bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
                <div>
                  <span className="text-purple-300 font-semibold">Visual Traits: </span>
                  <span className="text-zinc-300">{char.visualDescription}</span>
                </div>
                {char.attire && (
                  <div>
                    <span className="text-blue-300 font-semibold">Wardrobe: </span>
                    <span className="text-zinc-300">{char.attire}</span>
                  </div>
                )}
                {char.keyProps && char.keyProps !== 'None' && (
                  <div>
                    <span className="text-emerald-300 font-semibold">Key Props: </span>
                    <span className="text-zinc-300">{char.keyProps}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Character Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  {editingChar ? 'Edit Consistent Character' : 'Create Consistent Character'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Character Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Captain Eleanor Drake"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Narrative Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Submarine Navigator / Lead"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">
                  Visual Appearance & Facial Traits *
                </label>
                <textarea
                  value={visualDescription}
                  onChange={(e) => setVisualDescription(e.target.value)}
                  placeholder="e.g. Mid-30s, sharp high cheekbones, dark cropped pixie hair, intense emerald eyes, subtle scar across right eyebrow"
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-zinc-400">
                  Be specific about face, hair, age, and colors to preserve across video frames.
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Signature Wardrobe / Attire</label>
                <input
                  type="text"
                  value={attire}
                  onChange={(e) => setAttire(e.target.value)}
                  placeholder="e.g. Weathered slate-grey leather aviator jacket, brass buckle belt, cream turtleneck"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Key Props or Emblems</label>
                <input
                  type="text"
                  value={keyProps}
                  onChange={(e) => setKeyProps(e.target.value)}
                  placeholder="e.g. Brass sextant with glowing compass needle, worn leather notebook"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-600/30"
                >
                  {editingChar ? 'Save Changes' : 'Add to Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
