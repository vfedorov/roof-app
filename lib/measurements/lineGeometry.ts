import * as fabric from "fabric";

export type ScalePoint = { x: number; y: number };

export function updateLineLength({
    line,
    text,
    canvas,
    scale,
    scalePoints,
    naturalWidth,
}: {
    line: fabric.Line;
    text: fabric.IText;
    canvas: fabric.Canvas;
    scale: number | null;
    scalePoints: ScalePoint[];
    naturalWidth: number;
}) {
    if (scale === null || scalePoints.length !== 2 || naturalWidth === 0) {
        text.set({ text: "–" });
        return;
    }

    const lp = line.calcLinePoints();
    const p1 = new fabric.Point(lp.x1, lp.y1);
    const p2 = new fabric.Point(lp.x2, lp.y2);

    const matrix = line.calcTransformMatrix();
    const gp1 = p1.transform(matrix);
    const gp2 = p2.transform(matrix);

    const currentLinePx = gp1.distanceFrom(gp2);

    const displayedWidth = canvas.getWidth();
    const scaleRatio = naturalWidth / displayedWidth;
    const currentLinePxNatural = currentLinePx * scaleRatio;

    const scaleLinePx = Math.sqrt(
        Math.pow(scalePoints[1].x - scalePoints[0].x, 2) +
            Math.pow(scalePoints[1].y - scalePoints[0].y, 2),
    );

    const lengthFt = (currentLinePxNatural / scaleLinePx) * scale;

    text.set({
        left: (gp1.x + gp2.x) / 2,
        top: (gp1.y + gp2.y) / 2 - 10,
        text: `${lengthFt.toFixed(2)} ft`,
    });
}
