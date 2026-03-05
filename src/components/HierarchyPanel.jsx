import { Box, ChevronDown, ChevronRight, Cpu, Crosshair, Plus, Rocket, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

function nodeIcon(node) {
  if (node?.agent) return <Cpu size={14} className="text-[#00ffcc]" />;
  if (node?.name?.toLowerCase?.().includes('goal')) return <Rocket size={14} className="text-red-400" />;
  if (node?.sensorMount || node?.type === 'sensor') return <Crosshair size={14} className="text-yellow-300" />;
  return <Box size={14} className="text-gray-400" />;
}

export default function HierarchyPanel({
  objects,
  selectedId,
  onSelect,
  onRename,
  onAddObject,
  onDeleteObject,
  isPlaying,
  query,
  onQueryChange,
}) {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const childrenByParent = useMemo(() => {
    const map = new Map();
    objects.forEach((item) => {
      const parentKey = item.parentId || '__root__';
      const list = map.get(parentKey) || [];
      list.push(item);
      map.set(parentKey, list);
    });
    return map;
  }, [objects]);

  const filter = query.trim().toLowerCase();

  const visibleIds = useMemo(() => {
    if (!filter) return null;
    const keep = new Set();
    const walk = (node) => {
      const own = String(node.name || '').toLowerCase().includes(filter) || String(node.type || '').toLowerCase().includes(filter);
      const children = childrenByParent.get(node.id) || [];
      const childMatch = children.some((c) => walk(c));
      const matched = own || childMatch;
      if (matched) keep.add(node.id);
      return matched;
    };
    (childrenByParent.get('__root__') || []).forEach((node) => walk(node));
    return keep;
  }, [childrenByParent, filter]);

  const toggleNode = (id) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitRename = () => {
    if (!editingId) return;
    onRename(editingId, draftName);
    setEditingId(null);
    setDraftName('');
  };

  const renderTree = (parentId = '__root__', depth = 0) => {
    const nodes = childrenByParent.get(parentId) || [];
    return nodes.map((node) => {
      if (visibleIds && !visibleIds.has(node.id)) return null;
      const children = childrenByParent.get(node.id) || [];
      const hasChildren = children.length > 0;
      const expanded = expandedNodes.has(node.id);
      const isEditing = editingId === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm mx-1 ${selectedId === node.id ? 'bg-[#3a72b833] text-white' : 'hover:bg-[#2a2a2b] text-gray-300'}`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => {
              setEditingId(node.id);
              setDraftName(node.name || '');
            }}
          >
            <button
              type="button"
              className="w-4 h-4 flex items-center justify-center text-gray-500"
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) toggleNode(node.id);
              }}
            >
              {hasChildren ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
            </button>
            {nodeIcon(node)}
            {isEditing ? (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={submitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitRename();
                  if (event.key === 'Escape') {
                    setEditingId(null);
                    setDraftName('');
                  }
                }}
                className="flex-1 bg-[#1a1a1a] border border-[#3a72b8] text-white text-xs px-2 py-1 rounded outline-none"
                autoFocus
              />
            ) : (
              <span className="truncate text-xs font-semibold">{node.name}</span>
            )}
          </div>
          {hasChildren && expanded && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <section className="h-full flex flex-col bg-[#2b2b2c] border-r border-[#1e1e1e]">
      <div className="h-9 bg-[#303031] flex items-center px-3 border-b border-[#1f1f1f] font-semibold text-[11px] text-gray-300 tracking-wide uppercase">
        <span>Hierarchy</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={isPlaying}
            onClick={() => onAddObject('cube')}
            className="p-1 rounded-sm text-gray-400 hover:text-white disabled:opacity-40"
            title="Add object"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            disabled={!selectedId || isPlaying}
            onClick={() => onDeleteObject(selectedId)}
            className="p-1 rounded-sm text-gray-400 hover:text-red-400 disabled:opacity-40"
            title="Delete selected"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-[#222] bg-[#252526]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or type..."
          className="w-full bg-[#1f1f20] text-[#ddd] px-3 py-1.5 rounded-sm text-[11px] border border-[#3d3d3d] focus:outline-none focus:border-[#3a72b8]"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {renderTree()}
      </div>
    </section>
  );
}
