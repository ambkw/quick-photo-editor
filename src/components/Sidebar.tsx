import React, { useRef } from 'react';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/imageHelpers';
import { 
  Plus, 
  Trash2, 
  Download, 
  Layers, 
  FileImage
} from 'lucide-react';

interface SidebarProps {
  images: ImageItem[];
  selectedImageId: string | null;
  onSelectImage: (id: string) => void;
  onAddImages: (files: FileList) => void;
  onDeleteImage: (id: string) => void;
  onDownloadSingle: (image: ImageItem) => void;
  onDownloadAllZip: () => void;
  isDownloading: boolean;
}

export default function Sidebar({
  images,
  selectedImageId,
  onSelectImage,
  onAddImages,
  onDeleteImage,
  onDownloadSingle,
  onDownloadAllZip,
  isDownloading
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
    }
  };

  const selectedImage = images.find(img => img.id === selectedImageId);

  return (
    <aside id="sidebar-container" className="w-80 border-r border-slate-800 bg-slate-900/40 flex flex-col h-full overflow-hidden select-none">
      {/* Upload Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-2">
        <h2 className="font-sans font-semibold tracking-tight text-slate-200 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Galerie de photos ({images.length})
        </h2>
        
        <div className="flex gap-2 mt-2">
          <button
            id="upload-button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-sans text-xs font-medium py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer shadow-md hover:shadow-emerald-500/10 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter des photos
          </button>
        </div>

        <input
          id="file-uploader-hidden"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Gallery List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-700">
        {images.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <FileImage className="w-10 h-10 text-slate-600 mb-2.5 animate-pulse" />
            <p className="text-slate-400 text-xs font-medium">Aucune image chargée</p>
            <p className="text-slate-500 text-[11px] mt-1 px-4 leading-relaxed">
              Glissez-déposez vos photos ou utilisez les boutons ci-dessus.
            </p>
          </div>
        ) : (
          images.map((img) => {
            const isSelected = img.id === selectedImageId;
            return (
              <div
                key={img.id}
                id={`gallery-item-${img.id}`}
                onClick={() => onSelectImage(img.id)}
                className={`group relative p-2.5 rounded-xl border flex items-center gap-3 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/80 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/30 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Display */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-950 flex-none border border-slate-800/80">
                  <img
                    src={img.objectUrl}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle active checkmark or indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-slate-200 text-xs font-medium truncate leading-normal">
                    {img.name}
                  </p>
                  <p className="text-slate-400 text-[10px] tracking-normal mt-0.5">
                    {img.width} × {img.height}
                  </p>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    Original: {formatBytes(img.file.size)}
                  </p>
                </div>

                {/* Quick actions panel */}
                <button
                  id={`delete-image-${img.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  title="Supprimer la photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-slate-900/25 border border-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Downloads Actions Footer */}
      {images.length > 0 && (
        <div id="downloads-header" className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-2 flex-none">
          {selectedImage && (
            <button
              id="download-single-btn"
              disabled={isDownloading}
              onClick={() => onDownloadSingle(selectedImage)}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-sans text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors border border-slate-700/60 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              Télécharger l'image courante
            </button>
          )}

          <button
            id="download-all-btn"
            disabled={isDownloading || images.length < 2}
            onClick={onDownloadAllZip}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-sans text-xs font-bold py-2.5 px-4 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-900/10 disabled:border-slate-800/80 disabled:text-slate-600"
          >
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Génération de l'archive ZIP...
              </span>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-teal-400" />
                Télécharger toutes ({images.length}) en .zip
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
