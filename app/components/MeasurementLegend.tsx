import React from "react";
import { LegendItem } from "@/lib/measurements/useMeasurementLegend";

interface MeasurementLegendProps {
    items: LegendItem[];
    onSelect: (id: string) => void;
    isExpanded: boolean;
    onToggle: () => void;
}

const TYPE_COLORS: Record<string, string> = {
    "roof area": "#FF6B6B",
    "roof damage": "#FF9F43",
    "siding area": "#4ECDC4",
    "siding damage": "#FF6B9D",
    trim: "#45B7D1",
    ridge: "#96CEB4",
    eave: "#FFEAA7",
    other: "#A0A0A0",
};

const MeasurementLegend: React.FC<MeasurementLegendProps> = ({
    items,
    onSelect,
    isExpanded,
    onToggle,
}) => {
    if (items.length === 0) return null;

    return (
        <div className="legend-panel w-full bg-gray-800 text-white">
            {/* Заголовок — всегда виден */}
            <div
                onClick={onToggle}
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-700 transition-colors"
            >
                <h3 className="text-lg font-semibold">Legend ({items.length})</h3>
                <span className="text-xl">{isExpanded ? "▲" : "▼"}</span>
            </div>

            {/* Содержимое — только если развёрнуто */}
            {isExpanded && (
                <div className="p-3 space-y-2 border-t border-gray-700">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: TYPE_COLORS[item.surfaceType] || "#888" }}
                            ></span>
                            <div className="text-base">
                                <div className="font-medium">
                                    {item.displayName} ({item.surfaceType})
                                </div>
                                <div className="text-gray-400">{item.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MeasurementLegend;
