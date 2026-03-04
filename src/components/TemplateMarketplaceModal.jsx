import React, { useEffect, useState } from 'react';
import { Download, Search, X } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { getModelCompatibility, isTemplate2D } from '../lib/templateEngine';

export default function TemplateMarketplaceModal({ onClose, onUseTemplate }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async (text = '') => {
    try {
      setLoading(true);
      setError('');
      const data = await apiClient.listTemplates(text);
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load templates.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates('');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-4xl bg-[#111] border border-[#333] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Template Marketplace</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 border-b border-[#222] flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadTemplates(query);
              }}
              placeholder="Search templates"
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-md pl-9 pr-3 py-2 text-white outline-none focus:border-[#00ffcc]"
            />
          </div>
          <button onClick={() => loadTemplates(query)} className="px-4 py-2 rounded-md bg-[#00ffcc] hover:bg-[#00d6ad] text-black font-bold">Search</button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {loading && <div className="text-sm text-gray-400">Loading templates...</div>}
          {error && <div className="text-sm text-red-300">{error}</div>}
          {!loading && !error && items.length === 0 && <div className="text-sm text-gray-500">No templates available yet.</div>}

          {items.map((item) => {
            const compatibility = getModelCompatibility(item.template);
            return (
              <div key={item.id} className="border border-[#333] bg-[#151515] rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black text-white tracking-wide">{item.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Env: {item.template.environment} · Robot: {item.template.robot} · Model: {item.template.model}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Tags: {(item.tags || []).join(', ') || 'none'}</div>
                    <div className={`text-[11px] mt-2 ${compatibility.compatible ? 'text-green-400' : 'text-red-400'}`}>
                      {compatibility.reason}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const timestamp = Date.now();
                      onUseTemplate({
                        name: `${item.name} Project`,
                        template: 'custom',
                        projectId: `market-${timestamp}`,
                        is2D: isTemplate2D(item.template),
                        templateSpec: item.template,
                        config: {
                          environment: item.template.environment,
                          robot: item.template.robot,
                          model: item.template.model,
                        },
                      });
                    }}
                    className="px-4 py-2 rounded-md bg-[#222] hover:bg-[#2e2e2e] text-gray-200 border border-[#444] font-semibold flex items-center gap-2"
                  >
                    <Download size={14} /> Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
