export interface BlurStroke {
  id: string;
  points: { x: number; y: number }[]; // Coordinates as % of original image dimensions (0 to 100)
  size: number; // Size as % of image width
  strength: number; // Blur power (px)
}

export interface OverlayItem {
  id: string;
  type: 'text' | 'emoji';
  content: string;
  x: number; // Coordinates as % of original/cropped image (0 to 100)
  y: number; // Coordinates as % of original/cropped image (0 to 100)
  size: number; // Font size as % of image width
  color: string;
  fontFamily: string;
  rotation: number; // in degrees
}

export interface CropState {
  x: number; // % offset from left (0-100)
  y: number; // % offset from top (0-100)
  width: number; // % width (0-100)
  height: number; // % height (0-100)
  aspectRatio: string; // 'free', '1:1', '3:4', '4:5', '9:16', '4:3', '16:9', '2:1'
}

export interface ImageAdjustments {
  brightness: number;  // 0 to 200 (100 is default)
  contrast: number;    // 0 to 200 (100 is default)
  saturation: number;  // 0 to 200 (100 is default)
  generalBlur: number; // 0 to 100 (0 is default)
}

export interface ImageItem {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
  width: number;
  height: number;
  adjustments: ImageAdjustments;
  crop: CropState | null;
  blurStrokes: BlurStroke[];
  overlays: OverlayItem[];
}

export interface GlobalOptimizeSettings {
  enabled: boolean;
  format: 'jpeg' | 'png' | 'webp';
  quality: number; // 0.1 to 1.0 (default 0.8)
  resizeMaxWidth: number; // 0 for unlimited, or e.g., 2048 for auto downscale
  preserveExif: boolean;
}

export type EditMode = 'none' | 'blur_brush' | 'crop' | 'adjust' | 'text_overlay';
