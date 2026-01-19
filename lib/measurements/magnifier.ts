import * as fabric from "fabric";

export type MagnifierInstance = {
    show: (x: number, y: number, k: number) => void;
    hide: () => void;
    destroy: () => void;
};

const MAG_SIZE = 120;
const SOURCE_SIZE = 40;
const ZOOM = 3;
const OFFSET = 60;

export function createMagnifier(
    fabricCanvas: fabric.Canvas,
    container: HTMLElement,
): MagnifierInstance {
    const canvas = document.createElement("canvas");
    canvas.width = MAG_SIZE;
    canvas.height = MAG_SIZE;
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "30";
    canvas.style.border = "2px solid rgba(255,255,255,0.9)";
    canvas.style.borderRadius = "8px";
    canvas.style.background = "#000";

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Magnifier context not available");

    container.appendChild(canvas);

    function show(x: number, y: number, k: number = 1) {
        const rect = container.getBoundingClientRect();

        let left = x / k + OFFSET;
        let top = y / k - OFFSET;

        if (left + MAG_SIZE > rect.width) {
            left = x / k - MAG_SIZE - OFFSET;
        }

        if (top < 0) {
            top = y / k + OFFSET;
        }

        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;

        const source = fabricCanvas.lowerCanvasEl;
        if (!source) return;

        const sx = Math.max(0, x - SOURCE_SIZE / 2);
        const sy = Math.max(0, y - SOURCE_SIZE / 2);

        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE);
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(
            source,
            sx,
            sy,
            SOURCE_SIZE,
            SOURCE_SIZE,
            0,
            0,
            SOURCE_SIZE * ZOOM,
            SOURCE_SIZE * ZOOM,
        );

        canvas.style.display = "block";
    }

    function hide() {
        canvas.style.display = "none";
    }

    function destroy() {
        canvas.remove();
    }

    hide();

    return { show, hide, destroy };
}
