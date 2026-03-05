
export default function SceneCanvas({
  ViewComponent,
  objects,
  isPlaying,
  isTraining,
  selectedId,
  transformMode,
  onTransformChange,
  showGrid,
  gridFollowCamera,
  skyboxType,
  is2D,
  focusTrigger,
  environmentProfile,
}) {
  if (typeof ViewComponent !== 'function') {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs font-black tracking-widest uppercase text-gray-500 bg-[#111] border border-[#2b2b2b]">
        Scene Canvas Unavailable
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#111]">
      <ViewComponent
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
        focusTrigger={focusTrigger}
        environmentProfile={environmentProfile}
      />
    </div>
  );
}
