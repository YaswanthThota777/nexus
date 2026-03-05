import { Grid, Image as ImageIcon, Move, Video } from 'lucide-react';
import SceneCanvas from './SceneCanvas';

export default function SceneView({
  viewComponent,
  objects,
  isPlaying,
  isTraining,
  selectedId,
  transformMode,
  onTransformChange,
  showGrid,
  setShowGrid,
  gridFollowCamera,
  setGridFollowCamera,
  skyboxType,
  setSkyboxType,
  is2D,
  environmentProfile,
  focusTrigger,
  onDropAsset,
}) {
  return (
    <section className="h-full flex flex-col bg-[#252526] min-w-0">
      <div className="h-9 bg-[#303031] flex items-center px-3 border-b border-[#1f1f1f] space-x-2 select-none">
        <span className="px-3 py-1 text-[11px] font-extrabold rounded-sm uppercase tracking-wide bg-[#3a72b8] text-white">Scene</span>
        <div className="flex-1" />
        <div className="flex items-center space-x-1 bg-[#2a2a2b] p-1 rounded-sm border border-[#3d3d3d] mr-3">
          <button title="Toggle 3D Grid" onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded-sm transition-colors ${showGrid ? 'bg-[#3a72b8] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#343435]'}`}><Grid size={14} /></button>
          <button title={gridFollowCamera ? 'Grid follows camera sectors' : 'Grid locked to world origin'} onClick={() => setGridFollowCamera((prev) => !prev)} className={`p-1.5 rounded-sm transition-colors ${gridFollowCamera ? 'bg-[#3a72b8] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#343435]'}`}><Move size={14} /></button>
          <button title="Toggle Environment" onClick={() => setSkyboxType(skyboxType === 'unity' ? 'dark' : 'unity')} className={`p-1.5 rounded-sm transition-colors ${skyboxType === 'unity' ? 'bg-[#3a72b8] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-[#343435]'}`}><ImageIcon size={14} /></button>
        </div>
        <div className="text-[11px] font-semibold text-gray-300 flex items-center space-x-2 bg-[#2a2a2b] px-3 py-1 rounded-sm border border-[#3d3d3d]">
          <Video size={15} className="text-[#6ea8f5]" /><span>Perspective</span>
        </div>
      </div>

      <div
        className="flex-1 relative overflow-hidden bg-[#111]"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const type = event.dataTransfer.getData('application/x-nexus-asset-type');
          if (type && typeof onDropAsset === 'function') onDropAsset(type);
        }}
      >
        <SceneCanvas
          ViewComponent={viewComponent}
          objects={objects}
          isPlaying={isPlaying}
          isTraining={isTraining}
          selectedId={selectedId}
          transformMode={transformMode}
          onTransformChange={onTransformChange}
          showGrid={showGrid}
          gridFollowCamera={gridFollowCamera}
          skyboxType={skyboxType}
          is2D={is2D}
          environmentProfile={environmentProfile}
          focusTrigger={focusTrigger}
        />
      </div>
    </section>
  );
}
