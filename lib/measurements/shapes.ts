import * as fabric from "fabric";

export function outPolygonArea(polygonArea: number): string {
    if (polygonArea > 100) {
        return (polygonArea / 100).toFixed(2) + " square";
    }
    return polygonArea.toFixed(2) + " sq ft";
}

export function calculatePolygonArea(
    polygon: fabric.Polygon,
    scale: number | null,
    scalePoints: { x: number; y: number }[],
    imageDimensions: { naturalWidth: number; naturalHeight: number },
    canvas: fabric.Canvas,
): number {
    if (polygon.points.length < 3) return 0;
    if (!scale || scalePoints.length !== 2) return 0;

    const matrix = polygon.calcTransformMatrix();
    const transformed = polygon.points.map((pt) => new fabric.Point(pt.x, pt.y).transform(matrix));

    let pixelArea = 0;
    for (let i = 0; i < transformed.length; i++) {
        const j = (i + 1) % transformed.length;
        pixelArea += transformed[i].x * transformed[j].y - transformed[j].x * transformed[i].y;
    }
    pixelArea = Math.abs(pixelArea) / 2;

    const [p1, p2] = scalePoints;
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const p1Canvas = {
        x: (p1.x / imageDimensions.naturalWidth) * canvasWidth,
        y: (p1.y / imageDimensions.naturalHeight) * canvasHeight,
    };
    const p2Canvas = {
        x: (p2.x / imageDimensions.naturalWidth) * canvasWidth,
        y: (p2.y / imageDimensions.naturalHeight) * canvasHeight,
    };

    const scaleLinePx = Math.hypot(p2Canvas.x - p1Canvas.x, p2Canvas.y - p1Canvas.y);

    const feetPerPx = scale / scaleLinePx;
    return pixelArea * feetPerPx * feetPerPx;
}

export function syncVertexCircles(polygon: fabric.Polygon, canvas: fabric.Canvas) {
    const circles = (polygon as any).vertexCircles;
    if (!circles) return;

    const matrix = polygon.calcTransformMatrix();
    const offsetX = polygon.pathOffset.x;
    const offsetY = polygon.pathOffset.y;

    circles.forEach((circle: fabric.Circle, idx: number) => {
        const pt = polygon.points[idx];

        // ВАЖНО: компенсируем pathOffset
        const localPoint = new fabric.Point(pt.x - offsetX, pt.y - offsetY);

        const transformed = localPoint.transform(matrix);

        circle.set({
            left: transformed.x,
            top: transformed.y,
        });

        circle.setCoords();
    });

    canvas.renderAll();
}
