import React, { useRef, useState } from 'react';
import { ImageItem } from '../types';
import { formatBytes } from '../utils/imageHelpers';
import { 
  Plus, 
  Trash2, 
  Download, 
  Layers, 
  FileImage,
  Github,
  Info,
  ShieldCheck,
  Server,
  X,
  ExternalLink
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
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
    }
  };

  const selectedImage = images.find(img => img.id === selectedImageId);

  return (
    <aside id="sidebar-container" className="w-full lg:w-80 border-r-0 lg:border-r border-slate-800 bg-slate-900/40 flex flex-col h-full overflow-hidden select-none">
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
            Charger des photos
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

      {/* Code Source & Info Footer */}
      <div id="sidebar-footer" className="p-3 border-t border-slate-800 bg-slate-950/40 text-center flex-none">
        <button
          id="code-source-trigger"
          onClick={() => setIsInfoOpen(true)}
          className="text-[11px] text-slate-450 hover:text-emerald-400 font-medium hover:underline transition-all duration-250 cursor-pointer inline-flex items-center gap-1.5 focus:outline-none"
        >
          <Github className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400 transition-colors" />
          Code source & Infos
        </button>
      </div>

      {/* Informative Modal Popup */}
      {isInfoOpen && (
        <div 
          id="info-modal-backdrop"
          onClick={() => setIsInfoOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            id="info-modal-card"
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleIn flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-emerald-400" />
                <h3 className="font-sans font-semibold text-slate-200 text-sm">Code Source & Confidentialité</h3>
              </div>
              <button 
                id="close-info-modal-top"
                onClick={() => setIsInfoOpen(false)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-slate-800">
              
              {/* GitHub Link */}
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Github className="w-3 h-3 text-emerald-400" />
                  Code Source du Projet
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Cette application est entièrement open-source. Le code complet est accessible librement sur GitHub :
                </p>
                <a 
                  id="github-code-link"
                  href="https://github.com/ambkw/quick-photo-editor/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/40 transition-all font-mono text-[11px]"
                >
                  <span className="truncate">ambkw/quick-photo-editor</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-none text-emerald-400" />
                </a>
              </div>

              {/* Data Safety (aucune donnée n'est enregistrée) */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-800/50 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Respect de la vie privée
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-emerald-400">Aucune donnée n'est enregistrée.</strong> Toutes les manipulations et l'édition de vos photos sont effectuées directement localement dans la mémoire de votre navigateur internet. Aucune image, métadonnée ou information personnelle n'est envoyée vers un serveur externe. Vos photos restent les vôtres, en sécurité.
                </p>
              </div>

              {/* Hosting Info & Coordinates */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-800/50 text-left">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  Hébergement et Infrastructure
                </span>
                <p className="text-[11px] text-slate-350">
                  Le site web statique est hébergé de façon globale et sécurisée par le service <strong className="text-slate-200">GitHub Pages</strong>, fourni par la plateforme GitHub.
                </p>
                <div className="p-2.5 bg-slate-950/30 border border-slate-800 rounded-xl text-[10.5px] text-slate-500 space-y-1 font-sans leading-relaxed">
                  <p className="font-semibold text-slate-400">Coordonnées de l'hébergeur :</p>
                  <p className="text-slate-450 font-medium">GitHub, Inc.</p>
                  <p className="text-slate-450">88 Colin P. Kelly Jr. Street</p>
                  <p className="text-slate-450">San Francisco, CA 94107, USA</p>
                  <p className="text-[10px] pt-0.5">
                    Site officiel :{' '}
                    <a 
                      href="https://github.com" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="underline text-emerald-500/80 hover:text-emerald-400"
                    >
                      https://github.com
                    </a>
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button 
                id="close-info-modal-btn"
                onClick={() => setIsInfoOpen(false)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-sans text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                D'accord, j'ai compris
              </button>
            </div>

          </div>
        </div>
      )}
    </aside>
  );
}
