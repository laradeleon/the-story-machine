// where a picture sits in its box: x and y are % of the box (0 = centred), zoom is % (100 = fits)
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

export function tidy(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clamp_zoom(zoom: number): number {
  return Math.min(max_zoom, Math.max(min_zoom, Math.round(zoom)));
}

// how far a picture can move from the centre, in % of the box
export const max_offset = 100;

export function clamp_offset(offset: number): number {
  return tidy(Math.min(max_offset, Math.max(-max_offset, offset)));
}

// a number typed into a box, or null if empty, not a number or infinite (e.g. 1e400)
export function number_from_box(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// the CSS that places a picture in its box, in % so it keeps its place when resized
export function placement_style(placement: Placement): string {
  return (
    `left: calc(50% + ${placement.x}%); ` +
    `top: calc(50% + ${placement.y}%); ` +
    `transform: translate(-50%, -50%) scale(${placement.zoom / 100});`
  );
}
