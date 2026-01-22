import { useMeasurementSummary } from "@/lib/measurements/useMeasurementSummary";
import { MeasurementShape } from "@/lib/measurements/types";

interface SummaryPanelProps {
    shapes: MeasurementShape[];
}

export const MeasurementSummaryPanel = ({ shapes }: SummaryPanelProps) => {
    const summary = useMeasurementSummary(shapes);

    return (
        <div className="measurement-summary">
            {summary.roof.totalAreaSqFt > 0 && (
                <>
                    <h2>
                        <b>Roof</b>
                    </h2>
                    <p>Total Area: {summary.roof.totalAreaSqFt} sq ft</p>
                    <p>Squares: {summary.roof.totalSquares}</p>
                    <hr />
                </>
            )}

            {summary.siding.totalAreaSqFt > 0 && (
                <>
                    <h2>
                        <b>Siding</b>
                    </h2>
                    <p>Total Area: {summary.siding.totalAreaSqFt} sq ft</p>
                    <hr />
                </>
            )}

            {(summary.linear.ridge > 0 || summary.linear.eave > 0 || summary.linear.trim > 0) && (
                <>
                    <hr />
                    <h2>
                        <b>Linear Elements</b>
                    </h2>
                    {summary.linear.ridge > 0 && <p>Ridge: {summary.linear.ridge} ft</p>}
                    {summary.linear.eave > 0 && <p>Eave: {summary.linear.eave} ft</p>}
                    {summary.linear.trim > 0 && <p>Trim: {summary.linear.trim} ft</p>}
                    <hr />
                </>
            )}

            {summary.linear.other > 0 && (
                <>
                    <h2>
                        <b>Other Elements</b>
                    </h2>
                    <p>Area: {summary.otherAreaSqFt} ft</p>
                    <p>Linear: {summary.linear.other} ft</p>
                </>
            )}
        </div>
    );
};
