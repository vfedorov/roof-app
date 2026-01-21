import { useMeasurementSummary } from "@/lib/measurements/useMeasurementSummary";
import { MeasurementShape } from "@/lib/measurements/types";

interface SummaryPanelProps {
    shapes: MeasurementShape[];
}

export const MeasurementSummaryPanel = ({ shapes }: SummaryPanelProps) => {
    const summary = useMeasurementSummary(shapes);

    return (
        <div className="measurement-summary">
            <h2>
                <b>Roof</b>
            </h2>
            <p>Total Area: {summary.roof.totalAreaSqFt} sq ft</p>
            <p>Squares: {summary.roof.totalSquares}</p>

            <h2>
                <b>Siding</b>
            </h2>
            <p>Total Area: {summary.siding.totalAreaSqFt} sq ft</p>

            <h2>
                <b>Linear Elements</b>
            </h2>
            <p>Ridge: {summary.linear.ridge} ft</p>
            <p>Eave: {summary.linear.eave} ft</p>
            <p>Trim: {summary.linear.trim} ft</p>
            {summary.linear.other > 0 && <p>Other: {summary.linear.other} ft</p>}
        </div>
    );
};
