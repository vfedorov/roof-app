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

export const updatePolygonBoundingBox = (polygon: fabric.Polygon) => {
    if (!polygon.points || polygon.points.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    polygon.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    });

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    polygon.set({ left: minX, top: minY, width: width, height: height, dirty: true });
    polygon.setCoords();
    polygon.setBoundingBox();
};

export const createLineVertexPoints = (
    line: fabric.Line,
    canvas: fabric.Canvas,
    updateTextFn: () => void,
    syncLinePoints: (line: fabric.Line, canvas: fabric.Canvas) => void,
    autosave: () => void,
): fabric.Circle[] => {
    const vertexCircles: fabric.Circle[] = [];

    const coords = line.getCoords();
    const x1 = coords[0].x;
    const y1 = coords[0].y;
    const x2 = coords[1].x;
    const y2 = coords[1].y;

    [0, 1].forEach((idx) => {
        const isStart = idx === 0;
        const pointX = isStart ? x1 : x2;
        const pointY = isStart ? y1 : y2;

        const circle = new fabric.Circle({
            left: pointX,
            top: pointY,
            radius: 6,
            fill: "white",
            stroke: "blue",
            strokeWidth: 1,
            selectable: true,
            hasControls: false,
            hoverCursor: "pointer",
        });

        circle.set({
            originX: "center",
            originY: "center",
        });

        (circle as any).belongsTo = line;
        (circle as any).pointIndex = idx;

        vertexCircles.push(circle);

        setupLinePointHandlers(circle, line, canvas, updateTextFn, syncLinePoints, autosave);

        canvas.add(circle);
    });

    return vertexCircles;
};

const setupLinePointHandlers = (
    circle: fabric.Circle,
    line: fabric.Line,
    canvas: fabric.Canvas,
    updateTextFn: () => void,
    syncLinePoints: (line: fabric.Line, canvas: fabric.Canvas) => void,
    autosave: () => void,
) => {
    circle.on("moving", (e) => {
        e.e?.stopPropagation?.();

        const lineObj = (circle as any).belongsTo as fabric.Line;
        const pointIdx = (circle as any).pointIndex as number;

        if (!lineObj || pointIdx === undefined) return;

        const pointX = circle.left! + circle.radius! / 2;
        const pointY = circle.top! + circle.radius! / 2;

        const coords = lineObj.getCoords();
        const startPoint = coords[0];
        const endPoint = coords[1];
        if (pointIdx === 0) {
            startPoint.x = pointX;
            startPoint.y = pointY;
        } else {
            endPoint.x = pointX;
            endPoint.y = pointY;
        }

        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const new_angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        let new_length = lineObj.width;
        if (pointIdx === 1) {
            new_length = Math.sqrt(dx * dx + dy * dy);
        }

        lineObj.set({
            left: startPoint.x,
            top: startPoint.y,
            angle: new_angle,
            width: new_length,
            dirty: true,
        });

        lineObj.setCoords();
        canvas.renderAll();

        if (updateTextFn) updateTextFn();
        syncLinePoints(lineObj, canvas);
        autosave();
    });

    circle.on("mousedown", (e) => {
        e.e?.stopPropagation?.();
    });
};

export const syncLinePoints = (line: fabric.Line, canvas: fabric.Canvas) => {
    if (!line || !canvas) return;

    const points = (line as any).vertexCircles as fabric.Circle[];
    if (!points || !Array.isArray(points) || points.length < 2) return;

    const coords = line.getCoords();
    const x1 = coords[0].x;
    const y1 = coords[0].y;
    const x2 = coords[1].x;
    const y2 = coords[1].y;

    if (points[0]) {
        points[0].set({
            left: x1,
            top: y1,
            dirty: true,
        });
        points[0].setCoords();
    }

    if (points[1]) {
        points[1].set({
            left: x2,
            top: y2,
            dirty: true,
        });
        points[1].setCoords();
    }

    canvas.requestRenderAll();
};

export const removeLinePoints = (line: fabric.Object, canvas: fabric.Canvas) => {
    if (!line || !canvas) return;

    const vertexCircles = (line as any).vertexCircles as fabric.Circle[];
    if (!vertexCircles || !Array.isArray(vertexCircles)) return;

    vertexCircles.forEach((circle) => {
        if (canvas.contains(circle)) {
            canvas.remove(circle);
        }
    });
};

export function getDefaultWastePercentage(shapeType: string): number {
    switch (shapeType) {
        case "roof area":
            return 10;
        case "siding area":
            return 15;
        case "trim":
        case "ridge":
        case "eave":
            return 15;
        case "roof damage":
        case "siding damage":
            return 10;
        case "other":
        default:
            return 10;
    }
}
