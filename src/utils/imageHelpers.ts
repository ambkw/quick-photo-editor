import { ImageItem, BlurStroke, OverlayItem, GlobalOptimizeSettings } from '../types';

/**
 * Promisified image loading
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Erreur lors du chargement de l\'image'));
    img.src = src;
  });
}

/**
 * Format bytes to readable string (e.g. 1.2 MB, 340 KB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Octets';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generates the fully processed canvas (applies crop, adjustments, blur strokes, and overlays)
 */
export async function renderImageToCanvas(
  imageItem: ImageItem,
  globalOptimizeSettings?: GlobalOptimizeSettings
): Promise<HTMLCanvasElement> {
  // 1. Load original image
  const img = await loadImage(imageItem.objectUrl);
  
  // 2. Determine crop boundaries (absolute pixels)
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;
  
  let cropX = 0;
  let cropY = 0;
  let cropW = origW;
  let cropH = origH;
  
  if (imageItem.crop) {
    cropX = (imageItem.crop.x / 100) * origW;
    cropY = (imageItem.crop.y / 100) * origH;
    cropW = (imageItem.crop.width / 100) * origW;
    cropH = (imageItem.crop.height / 100) * origH;
  }
  
  // Guard for ultra tiny crops
  if (cropW < 1) cropW = 1;
  if (cropH < 1) cropH = 1;
  
  // 3. Create the main offscreen canvas representing the cropped area
  const mainCanvas = document.createElement('canvas');
  mainCanvas.width = cropW;
  mainCanvas.height = cropH;
  const ctx = mainCanvas.getContext('2d');
  if (!ctx) throw new Error('Impossible d\'obtenir le contexte Canvas 2D');
  
  // 4. Draw background base with adjustments (brightness, contrast, saturation, general blur)
  const adj = imageItem.adjustments;
  const filterParts: string[] = [];
  
  if (adj.brightness !== 100) filterParts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast !== 100) filterParts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== 100) filterParts.push(`saturate(${adj.saturation}%)`);
  if (adj.generalBlur > 0) filterParts.push(`blur(${adj.generalBlur}px)`);
  
  ctx.save();
  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }
  
  // Draw only the cropped portion of the original image
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  ctx.restore();
  
  // 5. Apply painting brush blur strokes if any exist
  if (imageItem.blurStrokes.length > 0) {
    // Apply each stroke individually so each stroke has its own correct scale and blur strength!
    for (const stroke of imageItem.blurStrokes) {
      if (stroke.points.length === 0) continue;

      // 5a. Create a mask canvas for this specific single stroke
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = cropW;
      maskCanvas.height = cropH;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) continue;

      // Clear mask to transparent
      maskCtx.fillStyle = 'rgba(0,0,0,0)';
      maskCtx.fillRect(0, 0, cropW, cropH);

      // Set stroke rendering parameters relative to crop canvas
      const brushSizePx = (stroke.size / 100) * cropW;
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      maskCtx.strokeStyle = 'white';
      maskCtx.fillStyle = 'white';
      maskCtx.lineWidth = brushSizePx;

      const convertPt = (pt: { x: number; y: number }) => {
        // Since React overlay matches display crop area exactly,
        // point coordinates are mapped directly to cropped canvas dimensions!
        return {
          x: (pt.x / 100) * cropW,
          y: (pt.y / 100) * cropH
        };
      };

      maskCtx.beginPath();
      const firstPoint = convertPt(stroke.points[0]);

      if (stroke.points.length === 1) {
        maskCtx.arc(firstPoint.x, firstPoint.y, brushSizePx / 2, 0, Math.PI * 2);
        maskCtx.fill();
      } else {
        maskCtx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p = convertPt(stroke.points[i]);
          maskCtx.lineTo(p.x, p.y);
        }
        maskCtx.stroke();
      }

      // 5b. Create temporary blurred canvas for this stroke's individual strength
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = cropW;
      blurCanvas.height = cropH;
      const blCtx = blurCanvas.getContext('2d');
      if (!blCtx) continue;

      blCtx.save();
      const strokeStrength = stroke.strength !== undefined ? stroke.strength : 15;
      const blurFilters = [...filterParts, `blur(${strokeStrength}px)`].join(' ');
      blCtx.filter = blurFilters;
      // Draw background image cropped portion
      blCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      blCtx.restore();

      // 5c. Combine using destination-in to shape the blurred contents to match the mask
      const finalBlurCanvas = document.createElement('canvas');
      finalBlurCanvas.width = cropW;
      finalBlurCanvas.height = cropH;
      const fbCtx = finalBlurCanvas.getContext('2d');
      if (fbCtx) {
        fbCtx.drawImage(maskCanvas, 0, 0);
        fbCtx.globalCompositeOperation = 'source-in';
        fbCtx.drawImage(blurCanvas, 0, 0);

        // Draw this single masked blur on top of the main canvas
        ctx.drawImage(finalBlurCanvas, 0, 0);
      }
    }
  }
  
  // 6. Draw overlaid elements (Texts and Emojis)
  // Overlays are placed relative to the cropped coordinates:
  // x, y are on key range [0 to 100] of the crop width/height
  for (const item of imageItem.overlays) {
    const ox = (item.x / 100) * cropW;
    const oy = (item.y / 100) * cropH;
    
    // Scale font size based on current crop scale
    // size is stored as percentage of crop width
    let fontSizePx = (item.size / 100) * cropW;
    if (fontSizePx < 8) fontSizePx = 8; // prevent invisible text
    
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate((item.rotation * Math.PI) / 180);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (item.type === 'emoji') {
      ctx.font = `${fontSizePx}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(item.content, 0, 0);
    } else {
      ctx.fillStyle = item.color;
      ctx.font = `${fontSizePx}px "${item.fontFamily || 'Inter'}", sans-serif`;
      
      // Draw subtle shadow for high accessibility contrast
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = Math.max(1, fontSizePx / 10);
      ctx.shadowOffsetX = Math.max(1, fontSizePx / 20);
      ctx.shadowOffsetY = Math.max(1, fontSizePx / 20);
      
      ctx.fillText(item.content, 0, 0);
    }
    ctx.restore();
  }
  
  // 7. Auto Optimize downscaling if requested
  if (globalOptimizeSettings && globalOptimizeSettings.enabled) {
    const maxDim = globalOptimizeSettings.resizeMaxWidth;
    if (maxDim > 0 && (cropW > maxDim || cropH > maxDim)) {
      const scale = Math.min(maxDim / cropW, maxDim / cropH);
      const optW = Math.round(cropW * scale);
      const optH = Math.round(cropH * scale);
      
      const optCanvas = document.createElement('canvas');
      optCanvas.width = optW;
      optCanvas.height = optH;
      const optCtx = optCanvas.getContext('2d');
      if (optCtx) {
        optCtx.drawImage(mainCanvas, 0, 0, cropW, cropH, 0, 0, optW, optH);
        return optCanvas;
      }
    }
  }
  
  return mainCanvas;
}

/**
 * Encapsulates photo compression logic and file output
 * Triggers weight optimization to shrink image size without breaking quality.
 */
export function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'jpeg' | 'png' | 'webp',
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let mimeType = 'image/jpeg';
    if (format === 'png') mimeType = 'image/png';
    else if (format === 'webp') mimeType = 'image/webp';
    
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erreur lors de la compression de l\'image en Blob'));
        }
      },
      mimeType,
      format === 'png' ? undefined : quality
    );
  });
}
