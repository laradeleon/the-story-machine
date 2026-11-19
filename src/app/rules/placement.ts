// where a picture sits in its box. x and y are a % of the box (0 = centred), zoom is a % (100 = fits the box).
// shared by the image editor, the thumbnails and, later, backgrounds
export interface Placement {
  x: number;
  y: number;
  zoom: number;
}

// where a picture sits when it's first added: centred, at 100% zoom
export const default_placement: Placement = { x: 0, y: 0, zoom: 100 };

// the zoom range the slider allows, in %
export const min_zoom = 50;
export const max_zoom = 300;

// keeps a number to one decimal place, so the saved values stay tidy
export function tidy(value: number): number {
  return Math.round(value * 10) / 10;
}

// keeps a zoom between min_zoom and max_zoom, to the nearest whole %
export function clamp_zoom(zoom: number): number {
  return Math.min(max_zoom, Math.max(min_zoom, Math.round(zoom)));
}

// how far a picture can be moved from the centre, in % of the box. at 100% it's moved a full box width
export const max_offset = 100;

// keeps an offset between -max_offset and max_offset, to one decimal place
export function clamp_offset(offset: number): number {
  return tidy(Math.min(max_offset, Math.max(-max_offset, offset)));
}

// reads a number typed into a box. null when it isn't a usable number: an empty box, a letter,
// or something too big to be a number such as 1e400 (which Number() turns into Infinity)
export function number_from_box(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// the CSS that places a picture inside its box. the offsets are % of the box,
// so the picture keeps its place when the box is resized
export function placement_style(placement: Placement): string {
  return (
    `left: calc(50% + ${placement.x}%); ` +
    `top: calc(50% + ${placement.y}%); ` +
    `transform: translate(-50%, -50%) scale(${placement.zoom / 100});`
  );
}
