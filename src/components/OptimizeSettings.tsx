import { GlobalOptimizeSettings } from '../types';
import { Sparkles, SlidersHorizontal, Image, ChevronRight, HelpCircle } from 'lucide-react';

interface OptimizeSettingsProps {
  settings: GlobalOptimizeSettings;
  onChange: (settings: GlobalOptimizeSettings) => void;
}

export default function OptimizeSettings({
  settings,
  onChange
}: OptimizeSettingsProps) {
  const updateSetting = <K extends keyof GlobalOptimizeSettings>(
    key: K,
    value: GlobalOptimizeSettings[K]
  ) => {
    onChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div id="optimize-panel" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
      {/* Header and Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="font-sans font-semibold text-slate-200 text-xs tracking-tight">
              Optimisation intelligente du poids
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Réduire la taille de l'image sans dégradation visible
            </p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <button
          id="btn-optimize-toggle"
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.enabled ? 'bg-emerald-500' : 'bg-slate-800'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-100 shadow ring-0 transition duration-200 ease-in-out ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {settings.enabled ? (
        <div id="optimize-details" className="pt-2 border-t border-slate-800/60 space-y-3.5 animate-fadeIn">
          {/* Format Selection */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-medium text-slate-400 flex items-center justify-between">
              <span>Format d'exportation</span>
              <span className="text-[9.5px] text-slate-500 uppercase font-mono">{settings.format}</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['jpeg', 'webp', 'png'] as const).map((fmt) => (
                <button
                  key={fmt}
                  id={`fmt-opt-${fmt}`}
                  onClick={() => updateSetting('format', fmt)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold uppercase tracking-tight border transition-all cursor-pointer ${
                    settings.format === fmt
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-slate-500 italic mt-1 leading-normal">
              {settings.format === 'jpeg' && '• JPEG: Excellence universelle, idéal pour compacter.'}
              {settings.format === 'webp' && '• WebP: Économies maximums de poids, idéal pour le web.'}
              {settings.format === 'png' && '• PNG: Sans perte, fichiers lourds mais transparents.'}
            </p>
          </div>

          {/* Quality Slider (Visible for jpeg or webp) */}
          {settings.format !== 'png' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-medium text-slate-400">
                <span>Qualité de compression</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {Math.round(settings.quality * 100)} %
                </span>
              </div>
              <input
                id="optimize-quality-slider"
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={settings.quality}
                onChange={(e) => updateSetting('quality', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 leading-normal">
                <span>Poids plume (20%)</span>
                <span>Optimisé (80% - Recommandé)</span>
                <span>Ultra (100%)</span>
              </div>
            </div>
          )}


        </div>
      ) : (
        <div id="optimize-disabled-info" className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-[10px] text-slate-500 leading-relaxed">
          Lorsque désactivé, vos photos seront téléchargées au format d'origine, à pleine résolution sans compression additionnelle. Activez pour alléger vos clichés.
        </div>
      )}
    </div>
  );
}
