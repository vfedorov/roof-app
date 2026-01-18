import * as fabric from "fabric";

export type MagnifierInstance = {
    show: (x: number, y: number) => void;
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

    function show(x: number, y: number) {
        const rect = container.getBoundingClientRect();

        let left = x + OFFSET;
        let top = y - OFFSET;

        if (left + MAG_SIZE > rect.width) {
            left = x - MAG_SIZE - OFFSET;
        }

        if (top < 0) {
            top = y + OFFSET;
        }

        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;

        const sourceCtx = fabricCanvas.contextContainer;
        if (!sourceCtx) return;

        const sx = Math.max(0, x - SOURCE_SIZE / 2);
        const sy = Math.max(0, y - SOURCE_SIZE / 2);

        const imageData = sourceCtx.getImageData(sx, sy, SOURCE_SIZE, SOURCE_SIZE);

        ctx?.clearRect(0, 0, MAG_SIZE, MAG_SIZE);
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
        }

        // temp canvas to scale
        const temp = document.createElement("canvas");
        temp.width = SOURCE_SIZE;
        temp.height = SOURCE_SIZE;
        const tctx = temp.getContext("2d")!;
        tctx.putImageData(imageData, 0, 0);

        ctx?.drawImage(
            temp,
            0,
            0,
            SOURCE_SIZE,
            SOURCE_SIZE,
            0,
            0,
            SOURCE_SIZE * ZOOM,
            SOURCE_SIZE * ZOOM,
        );

        canvas.style.left = `${x + OFFSET}px`;
        canvas.style.top = `${y - OFFSET}px`;
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
