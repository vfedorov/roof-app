import React from "react";
import { LegendItem, TYPE_COLORS } from "@/lib/measurements/useMeasurementLegend";

interface StaticMeasurementLegendProps {
    items: LegendItem[];
}

const StaticMeasurementLegend: React.FC<StaticMeasurementLegendProps> = ({ items }) => {
    if (!items.length) return null;

    return (
        <div className="w-full border rounded shadow-sm bg-gray-800 text-white">
            <div className="p-3 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Legend ({items.length})</h3>
            </div>

            <div className="p-3 space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded bg-gray-700/40"
                    >
                        <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                                backgroundColor: TYPE_COLORS[item.surfaceType] || "#888",
                            }}
                        />

                        <div className="text-base leading-tight">
                            <div className="font-medium">
                                {item.displayName} ({item.surfaceType})
                            </div>
                            <div className="text-gray-400 text-sm">Net: {item.valueNet}</div>
                            <div className="text-gray-300 text-sm">Gross: {item.valueGross}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaticMeasurementLegend;
