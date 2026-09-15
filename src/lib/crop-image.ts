/** Pixel rectangle inside the source image, as reported by react-easy-crop. */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be opened'));
    image.src = src;
  });
}

/**
 * Renders the chosen square of an image (after rotation) onto a canvas and
 * returns it as a JPEG file sized for avatars. Doing this in the browser keeps
 * uploads small and means the server never stores the uncropped original.
 */
export async function cropImageToFile(
  src: string,
  crop: PixelCrop,
  rotation: number,
  options: { size?: number; fileName?: string; quality?: number } = {},
): Promise<File> {
  const { size = 512, fileName = 'avatar.jpg', quality = 0.9 } = options;
  const image = await loadImage(src);

  // Draw the rotated image onto a canvas large enough to hold it, so the crop
  // coordinates (which react-easy-crop gives relative to the rotated image)
  // line up.
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedWidth = image.naturalWidth * cos + image.naturalHeight * sin;
  const rotatedHeight = image.naturalWidth * sin + image.naturalHeight * cos;

  const rotated = document.createElement('canvas');
  rotated.width = Math.round(rotatedWidth);
  rotated.height = Math.round(rotatedHeight);
  const rotatedCtx = rotated.getContext('2d');
  if (!rotatedCtx) throw new Error('Your browser cannot edit images');
  rotatedCtx.translate(rotated.width / 2, rotated.height / 2);
  rotatedCtx.rotate(radians);
  rotatedCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const output = document.createElement('canvas');
  const outputSize = Math.min(size, Math.round(crop.width));
  output.width = outputSize;
  output.height = outputSize;
  const outputCtx = output.getContext('2d');
  if (!outputCtx) throw new Error('Your browser cannot edit images');
  // JPEG has no transparency: paint white first so transparent PNGs don't turn black.
  outputCtx.fillStyle = '#ffffff';
  outputCtx.fillRect(0, 0, outputSize, outputSize);
  outputCtx.imageSmoothingQuality = 'high';
  outputCtx.drawImage(
    rotated,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Could not create the cropped image');
  return new File([blob], fileName, { type: 'image/jpeg' });
}
