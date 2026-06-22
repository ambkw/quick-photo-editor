import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  ImageItem, 
  EditMode, 
  CropState, 
  ImageAdjustments, 
  GlobalOptimizeSettings 
} from './types';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CanvasWorkspace from './components/CanvasWorkspace';
import OptimizeSettings from './components/OptimizeSettings';
import { loadImage, renderImageToCanvas, exportCanvasToBlob } from './utils/imageHelpers';
import { 
  Image as ImageIcon, 
  Sliders, 
  Eye, 
  HelpCircle,
  FileDown
} from 'lucide-react';

export default function App() {
  const [images, setImages] = useState<ImageItem[] | any[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Reset overlay selection when editMode or active image changes
  useEffect(() => {
    setSelectedOverlayId(null);
  }, [editMode, selectedImageId]);
  
  // Brush parameters
  const [brushSize, setBrushSize] = useState<number>(40);
  const [brushStrength, setBrushStrength] = useState<number>(15);

  // Crop parameters
  const [activeCropRatio, setActiveCropRatio] = useState<string>('free');
  const [temporaryCrop, setTemporaryCrop] = useState<CropState | null>(null);

  // Global weight optimization configuration
  const [optimizeSettings, setOptimizeSettings] = useState<GlobalOptimizeSettings>({
    enabled: true,
    format: 'jpeg',
    quality: 0.8,
    resizeMaxWidth: 2048,
    preserveExif: false
  });

  // Global downloading state indicator
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Visual dragover file loading states
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Responsive mobile active screen selection
  const [mobileTab, setMobileTab] = useState<'gallery' | 'edit'>('gallery');

  // Collapsible optimization settings
  const [isOptimizeExpanded, setIsOptimizeExpanded] = useState(false);

  // Selected image computed shortcut
  const selectedImage = images.find(img => img.id === selectedImageId) || null;

  // Global drag-and-drop actions on document view
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only set false if leaving document frame
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files.length > 0 : false) {
        addFilesToGallery(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [images]);

  // Handle files parsing & loading
  const addFilesToGallery = async (files: FileList) => {
    const newItems: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const objectUrl = URL.createObjectURL(file);
      
      try {
        const loadedImg = await loadImage(objectUrl);
        
        newItems.push({
          id: 'img-' + Date.now() + '-' + Math.round(Math.random() * 1000),
          name: file.name,
          file,
          objectUrl,
          width: loadedImg.naturalWidth || loadedImg.width,
          height: loadedImg.naturalHeight || loadedImg.height,
          adjustments: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            generalBlur: 0
          },
          crop: null,
          blurStrokes: [],
          overlays: []
        });
      } catch (err) {
        console.error('Erreur au chargement de l\'image ' + file.name, err);
      }
    }

    if (newItems.length > 0) {
      setImages((prev) => {
        const updated = [...prev, ...newItems];
        // Auto select first of added images
        setSelectedImageId(newItems[0].id);
        return updated;
      });
      setEditMode('none');
      setMobileTab('edit'); // Transition instantly to the editor on mobile when photos are loaded
    }
  };

  // State modifiers
  const handleSelectImage = (id: string) => {
    setSelectedImageId(id);
    setEditMode('none');
    setMobileTab('edit'); // Switch mobile view to active editor automatically
  };

  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find(img => img.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl); // Prevent memory leak

      const filtered = prev.filter(img => img.id !== id);
      if (selectedImageId === id) {
        setSelectedImageId(filtered.length > 0 ? filtered[0].id : null);
        setEditMode('none');
      }
      if (filtered.length === 0) {
        setMobileTab('gallery'); // Return to gallery overview if library becomes empty
      }
      return filtered;
    });
  };

  const handleUpdateImage = (updated: ImageItem) => {
    setImages((prev) => prev.map(img => (img.id === updated.id ? updated : img)));
  };

  // Crop controls
  const handleApplyCrop = () => {
    if (selectedImage && temporaryCrop) {
      handleUpdateImage({
        ...selectedImage,
        crop: { ...temporaryCrop }
      });
      setEditMode('none');
    }
  };

  const handleResetCrop = () => {
    if (selectedImage) {
      handleUpdateImage({
        ...selectedImage,
        crop: null
      });
      setActiveCropRatio('free');
      setTemporaryCrop(null);
    }
  };

  const handleCenterCrop = () => {
    if (temporaryCrop) {
      const w = temporaryCrop.width;
      const h = temporaryCrop.height;
      setTemporaryCrop({
        ...temporaryCrop,
        x: (100 - w) / 2,
        y: (100 - h) / 2
      });
    }
  };

  const handleCropRatioChange = (ratio: string) => {
    setActiveCropRatio(ratio);
    if (!temporaryCrop || !selectedImage) return;

    if (ratio === 'free') {
      setTemporaryCrop({
        ...temporaryCrop,
        aspectRatio: 'free'
      });
    } else {
      // Calculate locked proportional box height
      const parts = ratio.split(':').map(Number);
      const decRatio = parts[0] / parts[1]; // width / height

      const imgAspect = selectedImage.width / selectedImage.height;
      let w = temporaryCrop.width;
      let h = (w * imgAspect) / decRatio;

      // Bound fit
      if (temporaryCrop.y + h > 100) {
        h = 100 - temporaryCrop.y;
        w = (h * decRatio) / imgAspect;
      }

      setTemporaryCrop({
        ...temporaryCrop,
        width: w,
        height: h,
        aspectRatio: ratio
      });
    }
  };

  // Undo/Brush strokes modifiers
  const handleUndoStroke = () => {
    if (selectedImage) {
      handleUpdateImage({
        ...selectedImage,
        blurStrokes: selectedImage.blurStrokes.slice(0, -1)
      });
    }
  };

  const handleClearStrokes = () => {
    if (selectedImage) {
      handleUpdateImage({
        ...selectedImage,
        blurStrokes: []
      });
    }
  };

  // Overlay insertions
  const handleAddOverlay = (
    type: 'text' | 'emoji',
    content: string,
    color: string,
    fontFamily: string,
    size: number
  ) => {
    if (!selectedImage) return;

    const newItem = {
      id: 'ov-' + Date.now() + '-' + Math.round(Math.random() * 100),
      type,
      content,
      x: 50, // center default on canvas representation
      y: 50,
      size,
      color,
      fontFamily,
      rotation: 0
    };

    handleUpdateImage({
      ...selectedImage,
      overlays: [...selectedImage.overlays, newItem]
    });
  };

  // Downloads trigger single
  const handleDownloadSingle = async (image: ImageItem) => {
    try {
      setIsDownloading(true);
      const renderedCanvas = await renderImageToCanvas(image, optimizeSettings);
      
      const blobFormat = optimizeSettings.enabled ? optimizeSettings.format : 'jpeg';
      const blobQuality = optimizeSettings.enabled ? optimizeSettings.quality : 1.0;
      
      const blob = await exportCanvasToBlob(renderedCanvas, blobFormat, blobQuality);
      
      // Determine file extension
      const ext = optimizeSettings.enabled ? optimizeSettings.format : 'jpg';
      const rootName = image.name.substring(0, image.name.lastIndexOf('.')) || image.name;
      const downloadName = `${rootName}_retouche.${ext}`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Erreur lors du téléchargement', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Downloads trigger zip of all images
  const handleDownloadAllZip = async () => {
    if (images.length === 0) return;
    try {
      setIsDownloading(true);
      const zip = new JSZip();

      for (const img of images) {
        const renderedCanvas = await renderImageToCanvas(img, optimizeSettings);
        const format = optimizeSettings.enabled ? optimizeSettings.format : 'jpeg';
        const quality = optimizeSettings.enabled ? optimizeSettings.quality : 1.0;
        
        const blob = await exportCanvasToBlob(renderedCanvas, format, quality);
        const ext = optimizeSettings.enabled ? optimizeSettings.format : 'jpg';
        
        const rootName = img.name.substring(0, img.name.lastIndexOf('.')) || img.name;
        zip.file(`${rootName}_retouche.${ext}`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `mes_photos_retouchees_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Erreur lors de la génération du zip', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div id="photo-editor-app" className="flex flex-col h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden relative">
      
      {/* Visual background atmospheric lights */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Fullscreen dragover files drop wrapper overlay */}
      {isDraggingOver && (
        <div id="dragover-dropzone-screen" className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 border-4 border-dashed border-emerald-400 m-4 rounded-3xl animate-fadeIn pointer-events-none">
          <div className="p-5 bg-emerald-900/40 border border-emerald-500/30 rounded-full mb-4 animate-bounce">
            <FileDown className="w-12 h-12 text-emerald-300" />
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight text-white text-center">Déposez vos images ici !</h2>
          <p className="text-emerald-300 text-xs text-center mt-2 font-medium">Lâchez les fichiers pour les importer instantanément dans la galerie mobile/bureau.</p>
        </div>
      )}

      {/* Main Header navigation bar */}
      <header id="main-header" className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-sm px-6 flex items-center justify-between flex-none z-10 selection:bg-emerald-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Sliders className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-slate-100 text-sm tracking-tight">Outil de Retouche Photo</h1>
              <span className="text-[9px] bg-slate-800 text-slate-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700/60 uppercase">LOCAL</span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-wide mt-0.5">Recadrez, floutez, ajustez et optimisez plusieurs photos en local.</p>
          </div>
        </div>

        {/* Global info controls */}
        <div className="flex items-center gap-3.5">
          {images.length > 0 && (
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-900/80 border border-slate-850 px-2.5 py-1 rounded-lg">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10.5px] font-mono text-slate-400 font-medium">
                Galerie active : <strong className="text-emerald-400 font-bold">{images.length} photo{images.length > 1 ? 's' : ''}</strong>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Multi-Columns workspace layout */}
      <main id="main-structure-columns" className="flex-1 flex flex-col lg:flex-row overflow-hidden z-10 relative">
        
        {/* Left column : Gallery + Image manager */}
        <div id="col-sidebar" className={`${mobileTab === 'gallery' ? 'flex' : 'hidden'} lg:flex h-full flex-none w-full lg:w-80`}>
          <Sidebar
            images={images}
            selectedImageId={selectedImageId}
            onSelectImage={handleSelectImage}
            onAddImages={addFilesToGallery}
            onDeleteImage={handleDeleteImage}
            onDownloadSingle={handleDownloadSingle}
            onDownloadAllZip={handleDownloadAllZip}
            isDownloading={isDownloading}
          />
        </div>

        {/* Editor columns group container */}
        <div id="col-editor-group" className={`${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col lg:flex-row overflow-hidden min-h-0`}>
          
          {/* Canvas Workspace board */}
          <div className="h-[44vh] lg:h-auto lg:flex-1 flex flex-col justify-between overflow-hidden relative bg-slate-900/10 min-h-0">
            <CanvasWorkspace
              imageItem={selectedImage}
              editMode={editMode}
              onUpdateImage={handleUpdateImage}
              activeCropRatio={activeCropRatio}
              temporaryCrop={temporaryCrop}
              setTemporaryCrop={setTemporaryCrop}
              brushSize={brushSize}
              brushStrength={brushStrength}
              selectedOverlayId={selectedOverlayId}
              setSelectedOverlayId={setSelectedOverlayId}
            />

            {/* Quick inline Optimizations configuration bar when an image is loaded */}
            {images.length > 0 && (
              <div id="footer-optimization" className="p-2 border-t border-slate-900 bg-slate-950/40 backdrop-blur-sm shadow-md flex-none z-10">
                <div className="max-w-2xl mx-auto space-y-2">
                  <button 
                    id="btn-toggle-optimize-accordion"
                    onClick={() => setIsOptimizeExpanded(!isOptimizeExpanded)}
                    className="w-full flex items-center justify-between text-left px-2 sm:px-3 py-1 hover:bg-slate-900/40 rounded-lg transition-colors cursor-pointer text-xs focus:outline-none"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                      <span className="font-semibold text-slate-350 text-[11px] sm:text-xs truncate">Format d'export & Poids</span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium truncate hidden sm:inline">
                        ({optimizeSettings.enabled ? `${optimizeSettings.format.toUpperCase()} — Qualité ${Math.round(optimizeSettings.quality * 100)}%` : "Désactivé"})
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
                      {isOptimizeExpanded ? '▲ Réduire' : '▼ Configurer'}
                    </span>
                  </button>

                  {isOptimizeExpanded && (
                    <div className="pt-2 border-t border-slate-900/60 animate-fadeIn">
                      <OptimizeSettings
                        settings={optimizeSettings}
                        onChange={setOptimizeSettings}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column controls */}
          <div className="h-[42vh] lg:h-auto lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-900 bg-slate-950/20 flex-none lg:flex divide-y divide-slate-900 overflow-hidden">
            {selectedImage ? (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <Toolbar
                  editMode={editMode}
                  setEditMode={setEditMode}
                  adjustments={selectedImage.adjustments}
                  onAdjustmentsChange={(adjustments: ImageAdjustments) => {
                    handleUpdateImage({
                      ...selectedImage,
                      adjustments
                    });
                  }}
                  activeCropRatio={activeCropRatio}
                  onCropRatioChange={handleCropRatioChange}
                  onApplyCrop={handleApplyCrop}
                  onResetCrop={handleResetCrop}
                  onCenterCrop={handleCenterCrop}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                  brushStrength={brushStrength}
                  setBrushStrength={setBrushStrength}
                  onUndoStroke={handleUndoStroke}
                  onClearStrokes={handleClearStrokes}
                  strokeCount={selectedImage.blurStrokes.length}
                  onAddOverlay={handleAddOverlay}
                  selectedOverlayId={selectedOverlayId}
                  setSelectedOverlayId={setSelectedOverlayId}
                  overlays={selectedImage.overlays}
                  onUpdateOverlays={(overlays) => handleUpdateImage({ ...selectedImage, overlays })}
                />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 select-none bg-slate-950/20">
                <Sliders className="w-7 h-7 text-slate-800 mb-2.5" />
                <p className="text-slate-500 text-xs font-semibold leading-relaxed">Pas de photo active</p>
                <p className="text-slate-650 text-[10.5px] mt-1 pr-1 pl-1">Sélectionnez une image de votre galerie pour afficher la boîte d'outils de retouches.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Mobile Bottom Navigation Bars */}
      <div id="mobile-navigation" className="lg:hidden h-14 bg-slate-950 border-t border-slate-900 flex items-center justify-around flex-none z-20 px-4 select-none">
        
        {/* Gallery selection link */}
        <button
          id="btn-nav-gallery"
          onClick={() => setMobileTab('gallery')}
          className={`flex flex-col items-center gap-1.5 py-1 px-5 rounded-xl transition-all duration-200 cursor-pointer ${
            mobileTab === 'gallery'
              ? 'text-emerald-400 font-bold bg-slate-900/50'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <ImageIcon className="w-4.5 h-4.5" />
            {images.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-slate-950 font-mono text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {images.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wide">Galerie</span>
        </button>

        {/* Retouche and tools links */}
        <button
          id="btn-nav-edit"
          onClick={() => setMobileTab('edit')}
          className={`flex flex-col items-center gap-1.5 py-1 px-5 rounded-xl transition-all duration-200 cursor-pointer ${
            mobileTab === 'edit'
              ? 'text-emerald-400 font-bold bg-slate-900/50'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4.5 h-4.5" />
          <span className="text-[10px] tracking-wide">Retouches</span>
        </button>

      </div>

    </div>
  );
}
