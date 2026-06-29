/* Global type declaration for jsQR library loaded via CDN script tag */
declare const jsQR: (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => { data: string } | null;
