export const OPEN_FRONTIER_MASTER = Object.freeze({
  src: 'assets/art/source/open-frontier/open-frontier-master.jpg',
  width: 1280,
  height: 720,
});

const masterImage = typeof Image === 'undefined' ? null : new Image();
if (masterImage) masterImage.src = OPEN_FRONTIER_MASTER.src;

// The approved lane-balanced crop preserves the master image's native aspect
// ratio when it fills the 1400×540 gameplay viewport. It intentionally does
// not use canvas stretching or generated replacement scenery.
export function getOpenFrontierSourceCrop(targetWidth, targetHeight) {
  const sh = OPEN_FRONTIER_MASTER.width * targetHeight / targetWidth;
  return {
    sx: 0,
    sy: (OPEN_FRONTIER_MASTER.height - sh) / 2,
    sw: OPEN_FRONTIER_MASTER.width,
    sh,
  };
}

export function drawOpenFrontierBackground(ctx) {
  if (!masterImage?.complete || masterImage.naturalWidth !== OPEN_FRONTIER_MASTER.width) return false;

  const crop = getOpenFrontierSourceCrop(ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(
    masterImage,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    ctx.canvas.width,
    ctx.canvas.height,
  );
  return true;
}
