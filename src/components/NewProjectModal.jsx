import { useState } from 'react';

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#111] border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl text-white font-semibold mb-4">Create Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Project name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-[#0b0b0b] border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Warehouse RL"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-md text-gray-200 bg-gray-800 hover:bg-gray-700">Cancel</button>
            <button type="submit" className="px-3 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
