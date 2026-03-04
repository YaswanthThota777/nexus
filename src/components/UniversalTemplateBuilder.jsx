import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import {
  HERO_TEMPLATE_PRESETS,
  applyHeroTemplatePreset,
  TEMPLATE_FIELD_DEFS,
  createDefaultTemplateSpec,
  exportTemplatePack,
  getModelProfile,
  getModelCompatibility,
  importTemplatePack,
  isTemplate2D,
  validateTemplateSpec,
} from '../lib/templateEngine';
import { apiClient } from '../lib/apiClient';

export default function UniversalTemplateBuilder({ onClose, onCreate }) {
  const [projectName, setProjectName] = useState('Universal Robotics Project');
  const [templateSpec, setTemplateSpec] = useState(createDefaultTemplateSpec());
  const [validationError, setValidationError] = useState('');
  const [marketplaceStatus, setMarketplaceStatus] = useState('');
  const importRef = useRef(null);

  const compatibility = useMemo(() => getModelCompatibility(templateSpec), [templateSpec]);
  const modelProfile = useMemo(() => getModelProfile(templateSpec.model), [templateSpec.model]);

  const updateField = (key, value) => {
    setTemplateSpec((prev) => ({ ...prev, [key]: value }));
    setValidationError('');
  };

  const applyHeroPreset = (presetId) => {
    setTemplateSpec((prev) => applyHeroTemplatePreset(prev, presetId));
    const preset = HERO_TEMPLATE_PRESETS.find((item) => item.id === presetId);
    if (preset) {
      setProjectName(`${preset.name} Project`);
    }
    setValidationError('');
  };

  const handleCreate = () => {
    const validation = validateTemplateSpec(templateSpec);
    if (!validation.valid) {
      setValidationError(validation.errors.join(' '));
      return;
    }

    const timestamp = Date.now();
    onCreate({
      name: projectName.trim() || 'Universal Robotics Project',
      template: 'custom',
      projectId: `custom-${timestamp}`,
      is2D: isTemplate2D(templateSpec),
      templateSpec,
      config: {
        environment: templateSpec.environment,
        robot: templateSpec.robot,
        model: templateSpec.model,
      },
    });
  };

  const handlePublishTemplate = async () => {
    const validation = validateTemplateSpec(templateSpec);
    if (!validation.valid) {
      setValidationError(validation.errors.join(' '));
      return;
    }

    try {
      setMarketplaceStatus('Publishing...');
      const tags = [templateSpec.environment, templateSpec.robot, templateSpec.model, templateSpec.task];
      await apiClient.publishTemplate({
        name: `${projectName.trim() || 'Universal Template'} Pack`,
        tags,
        template: templateSpec,
      });
      setMarketplaceStatus('Published to marketplace');
    } catch (error) {
      setMarketplaceStatus(`Publish failed: ${error.message}`);
    }
  };

  const handleExportTemplate = () => {
    const payload = exportTemplatePack(templateSpec);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(projectName || 'template').replace(/\s+/g, '-').toLowerCase()}-template.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = importTemplatePack(String(reader.result));
      if (!result.valid) {
        setValidationError(result.error);
      } else {
        setTemplateSpec(result.template);
        setValidationError('');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-3xl bg-[#111] border border-[#333] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Universal Template Builder</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="col-span-1 md:col-span-2">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Project Name</div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]"
              placeholder="Enter project name"
            />
          </label>

          <div className="col-span-1 md:col-span-2 border rounded-md px-3 py-3 bg-[#0f0f0f] border-[#2a2a2a]">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Hero Robot Presets</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {HERO_TEMPLATE_PRESETS.map((preset) => {
                const isActive = templateSpec.robotProfile === preset.spec.robotProfile && templateSpec.robot === preset.spec.robot;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyHeroPreset(preset.id)}
                    className={`text-left px-3 py-2 rounded border transition-colors ${isActive ? 'bg-[#1f3650] border-[#3a72b8] text-white' : 'bg-[#171717] border-[#333] text-gray-300 hover:bg-[#202020]'}`}
                    title={preset.description}
                  >
                    <div className="text-[11px] font-black tracking-wide uppercase">{preset.name}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{preset.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {TEMPLATE_FIELD_DEFS.map((field) => {
            if (field.type === 'select') {
              return (
                <label key={field.key} className={field.key === 'task' ? 'col-span-1 md:col-span-2' : ''}>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">{field.label}</div>
                  <select
                    value={templateSpec[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]"
                  >
                    {field.options.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </label>
              );
            }

            if (field.type === 'number') {
              return (
                <label key={field.key}>
                  <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">{field.label}</div>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={templateSpec[field.key]}
                    onChange={(e) => updateField(field.key, Number(e.target.value))}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]"
                  />
                </label>
              );
            }

            if (field.type === 'boolean') {
              return (
                <label key={field.key} className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] rounded-md px-3 py-2">
                  <span className="text-xs uppercase tracking-wider text-gray-300">{field.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(templateSpec[field.key])}
                    onChange={(e) => updateField(field.key, e.target.checked)}
                    className="accent-[#00ffcc]"
                  />
                </label>
              );
            }

            return null;
          })}

          <div className="col-span-1 md:col-span-2 text-xs border rounded-md px-3 py-2 bg-[#0f0f0f] border-[#2a2a2a]">
            <span className={`font-black uppercase tracking-wider ${compatibility.compatible ? 'text-green-400' : 'text-red-400'}`}>
              {compatibility.compatible ? 'Compatible' : 'Incompatible'}
            </span>
            <span className="text-gray-300 ml-2">{compatibility.reason}</span>
          </div>

          <div className="col-span-1 md:col-span-2 text-xs border rounded-md px-3 py-2 bg-[#0f0f0f] border-[#2a2a2a] text-gray-300">
            <div className="font-black uppercase tracking-wider text-[#9fc3f0] mb-1">Model Profile</div>
            <div>Strategy: <span className="text-white font-semibold">{modelProfile.strategy}</span></div>
            <div>Strength: <span className="text-white font-semibold">{modelProfile.strength}</span></div>
            <div>Best For: <span className="text-white font-semibold">{modelProfile.bestFor.join(', ')}</span></div>
          </div>

          {validationError && (
            <div className="col-span-1 md:col-span-2 text-xs text-red-300 bg-red-950/40 border border-red-700/50 rounded-md px-3 py-2">
              {validationError}
            </div>
          )}

          {marketplaceStatus && (
            <div className="col-span-1 md:col-span-2 text-xs text-cyan-200 bg-cyan-950/30 border border-cyan-700/40 rounded-md px-3 py-2">
              {marketplaceStatus}
            </div>
          )}
        </div>

        <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={handleImportTemplate} />

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleExportTemplate} className="px-4 py-2 rounded-md bg-[#1a1a1a] hover:bg-[#232323] text-gray-200 border border-[#333] font-semibold flex items-center gap-2">
              <Download size={15} /> Export Template Pack
            </button>
            <button onClick={() => importRef.current?.click()} className="px-4 py-2 rounded-md bg-[#1a1a1a] hover:bg-[#232323] text-gray-200 border border-[#333] font-semibold flex items-center gap-2">
              <Upload size={15} /> Import Template Pack
            </button>
            <button onClick={handlePublishTemplate} className="px-4 py-2 rounded-md bg-[#1a1a1a] hover:bg-[#232323] text-gray-200 border border-[#333] font-semibold flex items-center gap-2">
              <Upload size={15} /> Publish Marketplace
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-[#222] hover:bg-[#2c2c2c] text-gray-300 font-semibold">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-md bg-[#00ffcc] hover:bg-[#00d6ad] text-black font-bold">Launch Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}
