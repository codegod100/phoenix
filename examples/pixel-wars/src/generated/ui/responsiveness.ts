export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
}

export interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export interface PointerEvent {
  x: number;
  y: number;
  type: 'start' | 'move' | 'end';
  pressure?: number;
}

export type PointerEventHandler = (event: PointerEvent) => void;

export class ResponsiveCanvas {
  private canvasId: string;
  private containerId: string;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private pointerHandlers: Set<PointerEventHandler> = new Set();
  private activeTouches: Map<number, TouchPoint> = new Map();
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private containerWidth: number = 800;
  private containerHeight: number = 600;

  constructor(canvasId: string, containerId: string) {
    this.canvasId = canvasId;
    this.containerId = containerId;
    this.updateScale();
  }

  private updateScale(): void {
    const scaleX = this.containerWidth / this.canvasWidth;
    const scaleY = this.containerHeight / this.canvasHeight;
    this.scale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = this.canvasWidth * this.scale;
    const scaledHeight = this.canvasHeight * this.scale;
    this.offsetX = (this.containerWidth - scaledWidth) / 2;
    this.offsetY = (this.containerHeight - scaledHeight) / 2;
  }

  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const x = (clientX - this.offsetX) / this.scale;
    const y = (clientY - this.offsetY) / this.scale;
    return { x, y };
  }

  public handlePointerStart(clientX: number, clientY: number, pressure: number = 1, identifier?: number): void {
    const coords = this.getCanvasCoordinates(clientX, clientY);
    
    if (identifier !== undefined) {
      this.activeTouches.set(identifier, {
        x: coords.x,
        y: coords.y,
        identifier
      });
    }

    this.emitPointerEvent({
      x: coords.x,
      y: coords.y,
      type: 'start',
      pressure
    });
  }

  public handlePointerMove(clientX: number, clientY: number, pressure: number = 1, identifier?: number): void {
    const coords = this.getCanvasCoordinates(clientX, clientY);
    
    if (identifier !== undefined) {
      if (this.activeTouches.has(identifier)) {
        this.activeTouches.set(identifier, {
          x: coords.x,
          y: coords.y,
          identifier
        });
      } else {
        return;
      }
    }

    this.emitPointerEvent({
      x: coords.x,
      y: coords.y,
      type: 'move',
      pressure
    });
  }

  public handlePointerEnd(clientX: number, clientY: number, identifier?: number): void {
    const coords = this.getCanvasCoordinates(clientX, clientY);
    
    if (identifier !== undefined) {
      if (this.activeTouches.has(identifier)) {
        this.activeTouches.delete(identifier);
      } else {
        return;
      }
    }

    this.emitPointerEvent({
      x: coords.x,
      y: coords.y,
      type: 'end',
      pressure: 0
    });
  }

  private emitPointerEvent(event: PointerEvent): void {
    this.pointerHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in pointer event handler:', error);
      }
    });
  }

  public addPointerEventListener(handler: PointerEventHandler): void {
    this.pointerHandlers.add(handler);
  }

  public removePointerEventListener(handler: PointerEventHandler): void {
    this.pointerHandlers.delete(handler);
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.updateScale();
  }

  public setContainerSize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    this.updateScale();
  }

  public getViewportInfo(): ViewportInfo {
    return {
      width: this.containerWidth,
      height: this.containerHeight,
      devicePixelRatio: 1,
      isMobile: this.detectMobile()
    };
  }

  private detectMobile(): boolean {
    return false;
  }

  public getScale(): number {
    return this.scale;
  }

  public getCanvasHTML(): string {
    return `<canvas id="${this.canvasId}" width="${this.canvasWidth}" height="${this.canvasHeight}" style="transform: scale(${this.scale}); transform-origin: top left; position: absolute; left: ${this.offsetX}px; top: ${this.offsetY}px;"></canvas>`;
  }

  public destroy(): void {
    this.pointerHandlers.clear();
    this.activeTouches.clear();
  }
}

export function createResponsiveCanvas(canvasId: string, containerId: string): ResponsiveCanvas {
  return new ResponsiveCanvas(canvasId, containerId);
}

export function isMobileDevice(): boolean {
  return false;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '34e0a94555fd05dabb716eb8d9f35d4ad180e267ff13ca20cc74e1b3326659db',
  name: 'Responsiveness',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;