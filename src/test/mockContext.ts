/** Recording mock of the renderer's 2D-context subset + canvas factories. */

import type { CanvasLike, Renderer2D } from '../engine/renderer';

export class MockContext2D implements Renderer2D {
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  fillStyle: unknown = '#000000';
  strokeStyle: unknown = '#000000';
  lineWidth = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  font = '10px sans-serif';
  textBaseline = 'alphabetic';
  textAlign = 'start';
  shadowColor = 'rgba(0, 0, 0, 0)';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;

  /** Every method call, recorded as [name, ...args]. */
  readonly log: unknown[][] = [];

  private record(name: string, ...args: unknown[]): void {
    this.log.push([name, ...args]);
  }

  calls(name: string): unknown[][] {
    return this.log.filter((entry) => entry[0] === name);
  }

  save(): void {
    this.record('save');
  }
  restore(): void {
    this.record('restore');
  }
  beginPath(): void {
    this.record('beginPath');
  }
  moveTo(x: number, y: number): void {
    this.record('moveTo', x, y);
  }
  lineTo(x: number, y: number): void {
    this.record('lineTo', x, y);
  }
  stroke(): void {
    this.record('stroke');
  }
  fill(): void {
    this.record('fill');
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.record('rect', x, y, w, h);
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void {
    this.record('ellipse', x, y, rx, ry, rot, a0, a1);
  }
  fillText(text: string, x: number, y: number): void {
    this.record('fillText', text, x, y);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.record('fillRect', x, y, w, h);
  }
  getImageData(sx: number, sy: number, sw: number, sh: number) {
    this.record('getImageData', sx, sy, sw, sh);
    return { data: new Uint8ClampedArray(sw * sh * 4), width: sw, height: sh };
  }
  putImageData(image: unknown, dx: number, dy: number): void {
    this.record('putImageData', image, dx, dy);
  }
  drawImage(image: unknown, dx: number, dy: number, dw?: number, dh?: number): void {
    this.record('drawImage', image, dx, dy, dw, dh);
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.record('setTransform', a, b, c, d, e, f);
  }
  translate(x: number, y: number): void {
    this.record('translate', x, y);
  }
  scale(x: number, y: number): void {
    this.record('scale', x, y);
  }
}

export class MockCanvas implements CanvasLike {
  readonly context = new MockContext2D();
  constructor(
    public width: number,
    public height: number,
  ) {}
  getContext(): Renderer2D | null {
    return this.context;
  }
}

/** Factories matching RenderOptions; `created` collects canvases for assertions. */
export function makeMockFactories() {
  const created: MockCanvas[] = [];
  return {
    created,
    createCanvas: (width: number, height: number): CanvasLike => {
      const canvas = new MockCanvas(width, height);
      created.push(canvas);
      return canvas;
    },
    createImageData: (data: Uint8ClampedArray, width: number, height: number) => ({
      data,
      width,
      height,
    }),
  };
}
