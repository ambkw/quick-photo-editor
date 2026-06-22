import React, { useRef, useEffect, useState } from 'react';
import { 
  ImageItem, 
  EditMode, 
  CropState, 
  OverlayItem, 
  BlurStroke 
} from '../types';
import { renderImageToCanvas } from '../utils/imageHelpers';
import { 
  Trash2, 
  RotateCw, 
  Scale, 
  HelpCircle, 
  Eye, 
  Move,
  Crop as CropIcon,
  Sparkles,
  Edit2
} from 'lucide-react';

interface CanvasWorkspaceProps {
  imageItem: ImageItem | null;
  editMode: EditMode;
  onUpdateImage: (updated: ImageItem) => void;
  activeCropRatio: string;
  temporaryCrop: CropState | null;
  setTemporaryCrop: (crop: CropState | null) => void;
  brushSize: number;
  brushStrength: number;
  selectedOverlayId: string | null;
  setSelectedOverlayId: (id: string | null) => void;
}

export default function CanvasWorkspace({
  imageItem,
  editMode,
  onUpdateImage,
  activeCropRatio,
  temporaryCrop,
  setTemporaryCrop,
  brushSize,
  brushStrength,
  selectedOverlayId,
  setSelectedOverlayId
}: CanvasWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isDrawingStroke, setIsDrawingStroke] = useState(false);
  const [activeStrokePoints, setActiveStrokePoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Dimensions of the canvas as displayed on screen in CSS pixels
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 0, height: 0 });

  // Refs for tracking drag operations
  const dragInfo = useRef<{
    type: 'overlay_move' | 'overlay_rotate' | 'overlay_resize' | 'crop_move' | 'crop_resize' | 'none';
    targetId?: string; // for overlays
    handle?: string; // for crop resize ('tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r')
    startX: number;
    startY: number;
    startOverlayX?: number; // state at drag start
    startOverlayY?: number;
    startOverlaySize?: number;
    startOverlayRotation?: number;
    startCropX?: number;
    startCropY?: number;
    startCropWidth?: number;
    startCropHeight?: number;
  }>({ type: 'none', startX: 0, startY: 0 });

  // Initialize crop frame if crop mode is activated
  useEffect(() => {
    if (editMode === 'crop' && imageItem && !temporaryCrop) {
      if (imageItem.crop) {
        setTemporaryCrop({ ...imageItem.crop });
      } else {
        // Compute initial crop box centered
        setTemporaryCrop({
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          aspectRatio: activeCropRatio
        });
      }
    } else if (editMode !== 'crop') {
      setTemporaryCrop(null);
    }
  }, [editMode, imageItem, activeCropRatio]);

  // Render the canvas on state changes
  useEffect(() => {
    if (!imageItem || !canvasRef.current) return;

    let active = true;
    const draw = async () => {
      try {
        setIsLoading(true);
        // We create a temporary rendering using full adjustments and crops.
        // For performance, we can load the image item
        const tempCrop = editMode === 'crop' ? null : imageItem.crop;
        
        // Render to canvas
        const renderedCanvas = await renderImageToCanvas({
          ...imageItem,
          // If in crop mode, we want to show the uncropped image underneath the crop overlay!
          crop: tempCrop,
          overlays: [] // Skip overlays for dynamic HTML layer rendering
        });

        if (!active) return;

        const mainCanvas = canvasRef.current;
        if (mainCanvas) {
          mainCanvas.width = renderedCanvas.width;
          mainCanvas.height = renderedCanvas.height;
          const ctx = mainCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            ctx.drawImage(renderedCanvas, 0, 0);
          }
          
          // Measure display bounds to synchronize overlays
          updateCanvasDisplayDimensions();
        }
      } catch (err) {
        console.error('Render error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    draw();

    return () => {
      active = false;
    };
  }, [imageItem, editMode]); // Redraw whenever image values or edit mode toggles

  // Listen to window size to adapt interactive overlays
  useEffect(() => {
    const handleResize = () => {
      updateCanvasDisplayDimensions();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateCanvasDisplayDimensions = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCanvasDisplaySize({
        width: rect.width,
        height: rect.height
      });
    }
  };

  if (!imageItem) {
    return (
      <div id="workspace-empty" className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/20 select-none">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800/80 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
            <Eye className="w-8 h-8 text-slate-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-sans tracking-tight font-semibold text-slate-200">
              Outil de retouches d'images en ligne
            </h1>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Pour démarrer, chargez une ou plusieurs photos depuis votre ordinateur en utilisant le bouton <strong className="text-emerald-400">Ajouter des photos</strong> dans le panneau latéral, ou en les glissant-déposant directement ici.
            </p>
          </div>
          
          <div className="pt-2 flex flex-wrap gap-2 justify-center text-[11px] text-slate-500">
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-800/50 rounded-full">⚡️ Full Client-Side</span>
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-800/50 rounded-full">🎨 Filtres CSS</span>
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-800/50 rounded-full">🔒 Sécurité garantie (Pas de Cloud)</span>
          </div>
        </div>
      </div>
    );
  }

  // Pointer event handlers for drawing or dragging operations
  const getRelativeCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode === 'blur_brush') {
      // Start drawing a blur stroke
      setIsDrawingStroke(true);
      const coords = getRelativeCoords(e);
      setActiveStrokePoints([coords]);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode === 'blur_brush') {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    if (editMode === 'blur_brush' && isDrawingStroke) {
      const coords = getRelativeCoords(e);
      setActiveStrokePoints((prev) => [...prev, coords]);
    } else if (dragInfo.current.type !== 'none') {
      // Implement overlay drag or crop drag
      handleDragMove(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode === 'blur_brush' && isDrawingStroke) {
      setIsDrawingStroke(false);
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (activeStrokePoints.length > 0) {
        // Brush size stored as percentage of display canvas width
        const brushSizePct = (brushSize / canvasDisplaySize.width) * 100;

        const newStroke: BlurStroke = {
          id: 'stroke-' + Date.now(),
          points: activeStrokePoints,
          size: brushSizePct,
          strength: brushStrength
        };

        onUpdateImage({
          ...imageItem,
          blurStrokes: [...imageItem.blurStrokes, newStroke]
        });
      }
      setActiveStrokePoints([]);
    } else if (dragInfo.current.type !== 'none') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      dragInfo.current = { type: 'none', startX: 0, startY: 0 };
    }
  };

  // Drag logic for Overlays and Crops
  const startOverlayDrag = (e: React.PointerEvent<any>, type: 'overlay_move' | 'overlay_rotate' | 'overlay_resize', item: OverlayItem) => {
    e.stopPropagation();
    setSelectedOverlayId(item.id);
    
    dragInfo.current = {
      type,
      targetId: item.id,
      startX: e.clientX,
      startY: e.clientY,
      startOverlayX: item.x,
      startOverlayY: item.y,
      startOverlaySize: item.size,
      startOverlayRotation: item.rotation
    };

    if (overlayRef.current) {
      try {
        overlayRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn("Failed to capture pointer on mask:", err);
      }
    }
  };

  const startCropDrag = (e: React.PointerEvent<any>, type: 'crop_move' | 'crop_resize', handle?: string) => {
    e.stopPropagation();
    if (!temporaryCrop) return;

    dragInfo.current = {
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCropX: temporaryCrop.x,
      startCropY: temporaryCrop.y,
      startCropWidth: temporaryCrop.width,
      startCropHeight: temporaryCrop.height
    };

    if (overlayRef.current) {
      try {
        overlayRef.current.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn("Failed to capture pointer on mask:", err);
      }
    }
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const info = dragInfo.current;
    if (info.type === 'none') return;

    const deltaX = e.clientX - info.startX;
    const deltaY = e.clientY - info.startY;

    // Convert mouse movement into canvas coordinates percentages
    const dxPct = (deltaX / canvasDisplaySize.width) * 100;
    const dyPct = (deltaY / canvasDisplaySize.height) * 100;

    if (info.type === 'overlay_move' && info.targetId) {
      const overlays = imageItem.overlays.map((ov) => {
        if (ov.id === info.targetId) {
          return {
            ...ov,
            x: Math.min(100, Math.max(0, (info.startOverlayX || 0) + dxPct)),
            y: Math.min(100, Math.max(0, (info.startOverlayY || 0) + dyPct))
          };
        }
        return ov;
      });
      onUpdateImage({ ...imageItem, overlays });
    }

    else if (info.type === 'overlay_resize' && info.targetId) {
      // Resize handles: increase font size relative to dragging away from center
      const overlays = imageItem.overlays.map((ov) => {
        if (ov.id === info.targetId) {
          // Approximate size scale change
          const sizeChange = dxPct * 0.5;
          return {
            ...ov,
            size: Math.min(40, Math.max(1, (info.startOverlaySize || 8) + sizeChange))
          };
        }
        return ov;
      });
      onUpdateImage({ ...imageItem, overlays });
    }

    else if (info.type === 'overlay_rotate' && info.targetId && overlayRef.current) {
      // Compute angle change based on center point
      const ov = imageItem.overlays.find(o => o.id === info.targetId);
      if (ov) {
        const rect = overlayRef.current.getBoundingClientRect();
        // Item point center absolute pixels
        const centerXPx = rect.left + (ov.x / 100) * rect.width;
        const centerYPx = rect.top + (ov.y / 100) * rect.height;
        
        // Angle relative to center
        const angleRad = Math.atan2(e.clientY - centerYPx, e.clientX - centerXPx);
        const angleDeg = (angleRad * 180) / Math.PI;
        
        const overlays = imageItem.overlays.map((item) => {
          if (item.id === info.targetId) {
            return {
              ...item,
              rotation: Math.round(angleDeg)
            };
          }
          return item;
        });
        onUpdateImage({ ...imageItem, overlays });
      }
    }

    else if (info.type === 'crop_move' && temporaryCrop) {
      let newX = (info.startCropX || 0) + dxPct;
      let newY = (info.startCropY || 0) + dyPct;

      // Bound check
      newX = Math.min(100 - temporaryCrop.width, Math.max(0, newX));
      newY = Math.min(100 - temporaryCrop.height, Math.max(0, newY));

      setTemporaryCrop({
        ...temporaryCrop,
        x: newX,
        y: newY
      });
    }

    else if (info.type === 'crop_resize' && temporaryCrop && info.handle) {
      let x = info.startCropX || 0;
      let y = info.startCropY || 0;
      let w = info.startCropWidth || 0;
      let h = info.startCropHeight || 0;

      const handle = info.handle;

      // Handle individual handle logic
      if (handle.includes('r')) {
        w = Math.min(100 - x, Math.max(5, w + dxPct));
      }
      if (handle.includes('l')) {
        const maxW = x + w;
        x = Math.max(0, Math.min(maxW - 5, x + dxPct));
        w = maxW - x;
      }
      if (handle.includes('b')) {
        h = Math.min(100 - y, Math.max(5, h + dyPct));
      }
      if (handle.includes('t')) {
        const maxH = y + h;
        y = Math.max(0, Math.min(maxH - 5, y + dyPct));
        h = maxH - y;
      }

      // Enforce aspect ratio constraints
      const ratioStr = temporaryCrop.aspectRatio;
      if (ratioStr !== 'free') {
        const parts = ratioStr.split(':').map(Number);
        const desiredRatio = parts[0] / parts[1]; // width / height Ratio

        // We lock height using the new width, considering original image aspect ratio
        const imgAspect = imageItem.width / imageItem.height;
        
        // Canvas coordinate formulas:
        // desiredRatio = cropPixelWidth / cropPixelHeight
        // cropPixelWidth = (w / 100) * imgWidth
        // cropPixelHeight = (h / 100) * imgHeight
        // w% / h% = desiredRatio * (imgHeight / imgWidth) = desiredRatio / imgAspect
        // h% = w% * imgAspect / desiredRatio
        h = (w * imgAspect) / desiredRatio;

        // Ensure we don't overflow the bottom boundary
        if (y + h > 100) {
          h = 100 - y;
          w = (h * desiredRatio) / imgAspect;
        }

        // If dragging from left/top, adjust anchoring
        if (handle.includes('l') && x + w > 100) {
          w = 100 - x;
          h = (w * imgAspect) / desiredRatio;
        }
      }

      setTemporaryCrop({
        ...temporaryCrop,
        x,
        y,
        width: w,
        height: h
      });
    }
  };

  const deleteOverlay = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const overlays = imageItem.overlays.filter(o => o.id !== id);
    onUpdateImage({ ...imageItem, overlays });
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  return (
    <div id="main-canvas-workspace" className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative" ref={containerRef}>
      
      {/* File dimensions overlay indicator */}
      <div id="canvas-status-ribbon" className="absolute top-4 left-4 z-10 flex items-center gap-2.5 bg-slate-900/95 border border-slate-800 rounded-lg px-2.5 py-1.5 shadow-md select-none">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[10px] text-slate-400 font-mono tracking-tight font-medium">
          Source : {imageItem.name} — <span className="text-slate-200 font-bold">{imageItem.width} × {imageItem.height} px</span>
        </span>
      </div>

      {/* Editing State Header Alert */}
      {editMode !== 'none' && (
        <div id="edit-mode-helper-overlay" className="absolute top-4 right-4 z-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-fadeIn">
          {editMode === 'blur_brush' && (
            <span className="text-[10px] text-rose-300 font-bold flex items-center gap-1">
              🎨 Mode Pinceau Actif — Dessiner sur l'image pour flouter
            </span>
          )}
          {editMode === 'crop' && (
            <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
              <CropIcon className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              Mode Recadrage (Drag boutons pour délimiter)
            </span>
          )}
          {editMode === 'text_overlay' && (
            <span className="text-[10px] text-teal-300 font-bold">
              ✏️ Déplacez, tournez ou supprimez vos titres/émojis
            </span>
          )}
          {editMode === 'adjust' && (
            <span className="text-[10px] text-slate-300 font-bold">
              🎛️ Curseurs d'ajustements actifs
            </span>
          )}
        </div>
      )}

      {/* Interactive Stage block */}
      <div 
        id="interactive-stage"
        className="relative max-w-full max-h-full flex items-center justify-center border-2 border-slate-900 rounded-2xl overflow-hidden shadow-2xl bg-slate-900/10"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-30 flex flex-col items-center justify-center space-y-2">
            <span className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-slate-300 font-mono">Calcule du rendu...</span>
          </div>
        )}

        {/* Core Canvas */}
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain block select-none bg-[#111]"
          style={{
            filter: editMode === 'blur_brush' ? 'none' : undefined
          }}
        />

        {/* Transparent Interactive Overlay representing the canvas bounding rect */}
        {canvasDisplaySize.width > 0 && (
          <div
            ref={overlayRef}
            id="interactive-overlay-mask"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setMousePos(null)}
            className={`absolute z-20 select-none group ${editMode === 'blur_brush' ? 'cursor-none' : 'cursor-default'}`}
            style={{
              width: canvasDisplaySize.width,
              height: canvasDisplaySize.height,
              touchAction: 'none'
            }}
          >
            {/* Circular brush preview cursor */}
            {editMode === 'blur_brush' && mousePos && (
              <div 
                className="absolute pointer-events-none rounded-full border border-rose-500/80 bg-rose-500/20 -translate-x-1/2 -translate-y-1/2 z-30"
                style={{
                  left: mousePos.x,
                  top: mousePos.y,
                  width: brushSize,
                  height: brushSize,
                }}
              />
            )}

            {/* Draw current reactive drawing line coordinates visually if painting */}
            {editMode === 'blur_brush' && activeStrokePoints.length > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <polyline
                  points={activeStrokePoints.map(p => `${(p.x/100)*canvasDisplaySize.width},${(p.y/100)*canvasDisplaySize.height}`).join(' ')}
                  fill="none"
                  stroke="rgba(244, 63, 94, 0.45)"
                  strokeWidth={brushSize} // Dynamic trace matching actual brush width!
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {/* Overlays list nodes clickable/draggable */}
            {imageItem.overlays.map((ov) => {
              const isEditing = editMode === 'text_overlay';
              const isSelected = isEditing && selectedOverlayId === ov.id;
              return (
                <div
                  key={ov.id}
                  id={`overlay-${ov.id}`}
                  onClick={isEditing ? (e) => {
                    e.stopPropagation();
                    setSelectedOverlayId(ov.id);
                  } : undefined}
                  onDoubleClick={isEditing ? (e) => {
                    e.stopPropagation();
                    setEditingOverlayId(ov.id);
                  } : undefined}
                  className={`absolute text-center whitespace-nowrap p-1.5 flex items-center justify-center transition-shadow select-none ${
                    isEditing 
                      ? `group/item border cursor-grab active:cursor-grabbing ${
                          isSelected 
                            ? 'border-dashed border-emerald-400 bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500/30' 
                            : 'border-transparent hover:border-slate-700/60'
                        }`
                      : 'pointer-events-none border-transparent'
                  }`}
                  style={{
                    left: `${ov.x}%`,
                    top: `${ov.y}%`,
                    transform: `translate(-50%, -50%) rotate(${ov.rotation}deg)`,
                    touchAction: isEditing ? 'none' : undefined
                  }}
                  onPointerDown={isEditing ? (e) => startOverlayDrag(e, 'overlay_move', ov) : undefined}
                >
                  {/* Element Render content */}
                  {editingOverlayId === ov.id && isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      value={ov.content}
                      onChange={(e) => {
                        const updated = imageItem.overlays.map((o) =>
                          o.id === ov.id ? { ...o, content: e.target.value } : o
                        );
                        onUpdateImage({ ...imageItem, overlays: updated });
                      }}
                      onBlur={() => setEditingOverlayId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingOverlayId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="bg-slate-900/90 text-white border border-emerald-500 rounded px-1.5 py-0.5 text-center focus:outline-none ring-1 ring-emerald-500 text-sm font-semibold select-text pointer-events-auto cursor-text z-50 shadow-xl font-sans"
                      style={{
                        color: ov.type === 'text' ? ov.color : undefined,
                        fontFamily: ov.type === 'text' ? `"${ov.fontFamily}", sans-serif` : undefined,
                        fontSize: `${(ov.size / 100) * canvasDisplaySize.width}px`,
                        width: `${Math.max(ov.content.length * 0.75 + 1.5, 4)}em`
                      }}
                    />
                  ) : ov.type === 'emoji' ? (
                    <span 
                      style={{ fontSize: `${(ov.size / 100) * canvasDisplaySize.width}px` }}
                      className="select-none leading-none block cursor-text font-sans"
                    >
                      {ov.content}
                    </span>
                  ) : (
                    <span
                      style={{ 
                        color: ov.color,
                        fontFamily: `"${ov.fontFamily}", sans-serif`,
                        fontSize: `${(ov.size / 100) * canvasDisplaySize.width}px`,
                      }}
                      className="font-sans font-bold select-none leading-normal drop-shadow-md cursor-text"
                    >
                      {ov.content}
                    </span>
                  )}

                  {/* Handles showing up ONLY when selected */}
                  {isSelected && isEditing && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Delete knob top left */}
                      <button
                        title="Supprimer"
                        className="absolute -top-3.5 -left-3.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md pointer-events-auto cursor-pointer"
                        onPointerDown={(e) => deleteOverlay(ov.id, e as any)}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>

                      {/* Rotate handle top right */}
                      <div
                        title="Faire tourner"
                        className="absolute -top-3.5 -right-3.5 p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-md pointer-events-auto cursor-alias touch-none"
                        onPointerDown={(e) => startOverlayDrag(e, 'overlay_rotate', ov)}
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                      </div>

                      {/* Edit/Pencil handle bottom left */}
                      <button
                        title="Modifier le texte"
                        className="absolute -bottom-3.5 -left-3.5 p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-md pointer-events-auto cursor-pointer"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setEditingOverlayId(ov.id);
                        }}
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      {/* Resize Handle bottom right */}
                      <div
                        title="Redimensionner"
                        className="absolute -bottom-3.5 -right-3.5 p-1 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-md pointer-events-auto cursor-se-resize touch-none"
                        onPointerDown={(e) => startOverlayDrag(e, 'overlay_resize', ov)}
                      >
                        <Scale className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Crop Boundary Overlays (Only visible when editMode is Crop) */}
            {editMode === 'crop' && temporaryCrop && (
              <div
                id="crop-selection-bounds"
                className="absolute border border-emerald-400 bg-slate-950/20 shadow-[-1px_-1px_0px_2000px_rgba(0,0,0,0.65)] touch-none"
                style={{
                  left: `${temporaryCrop.x}%`,
                  top: `${temporaryCrop.y}%`,
                  width: `${temporaryCrop.width}%`,
                  height: `${temporaryCrop.height}%`,
                }}
                onPointerDown={(e) => startCropDrag(e, 'crop_move')}
              >
                {/* 3x3 Grid rule lines inside crop */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-dashed border-white/60" />
                  <div className="border-r border-b border-dashed border-white/60" />
                  <div className="border-b border-dashed border-white/60" />
                  <div className="border-r border-b border-dashed border-white/60" />
                  <div className="border-r border-b border-dashed border-white/60" />
                  <div className="border-b border-dashed border-white/60" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div />
                </div>

                {/* Handles */}
                {/* Corners */}
                <div
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-emerald-400 border border-white rounded-xs cursor-nwse-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'tl')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-400 border border-white rounded-xs cursor-nesw-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'tr')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-emerald-400 border border-white rounded-xs cursor-nesw-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'bl')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-emerald-400 border border-white rounded-xs cursor-nwse-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'br')}
                />

                {/* Edges */}
                <div
                  className="absolute top-1/2 -left-1.5 w-1.5 h-4 bg-emerald-400 border border-white rounded-xs transform -translate-y-1/2 cursor-ew-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'l')}
                />
                <div
                  className="absolute top-1/2 -right-1.5 w-1.5 h-4 bg-emerald-400 border border-white rounded-xs transform -translate-y-1/2 cursor-ew-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'r')}
                />
                <div
                  className="absolute -top-1.5 left-1/2 w-4 h-1.5 bg-emerald-400 border border-white rounded-xs transform -translate-x-1/2 cursor-ns-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 't')}
                />
                <div
                  className="absolute -bottom-1.5 left-1/2 w-4 h-1.5 bg-emerald-400 border border-white rounded-xs transform -translate-x-1/2 cursor-ns-resize touch-none"
                  onPointerDown={(e) => startCropDrag(e, 'crop_resize', 'b')}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helpful Hint banner at the footer */}
      <p id="workspace-status" className="text-slate-500 text-[10.5px] mt-4 flex items-center gap-1">
        <HelpCircle className="w-3 h-3 text-slate-500 flex-none" />
        {editMode === 'none' && "Double-cliquez n'importe où pour réinitialiser ou sélectionnez un outil."}
        {editMode === 'crop' && "Tirez les poignées d'angle vertes. Appuyez sur 'Appliquer le recadrage' à droite."}
        {editMode === 'blur_brush' && "Maintenez le clic et déplacez pour badigeonner les parties confidentielles de flou."}
        {editMode === 'adjust' && "Faites glisser les réglettes d'ajustement. Vos modifications sont instantanées."}
        {editMode === 'text_overlay' && "Cliquez sur un texte inséré pour afficher les poignées d'action (déplacer, pivoter)."}
      </p>
    </div>
  );
}

// Helpers for data bindings
