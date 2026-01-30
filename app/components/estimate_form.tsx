"use client";

import React, { useState } from "react";
import { useToast } from "@/app/components/providers/toast-provider";
import { useRouter } from "next/navigation";

interface AssemblyCategory {
    id: string;
    category_name: string;
    type_name: "roofing" | "siding";
}

interface Assembly {
    id: string;
    assembly_name: string;
    assembly_type: string;
    assembly_category: string;
    pricing_type: string;
    material_price: number;
    labor_price: number;
    is_active: boolean;
}

interface MeasurementSession {
    id: string;
    session_name: string;
    inspection_id: string;
    created_at: string;
}

interface Inspection {
    id: string;
    inspection_name: string;
    address: string;
}

interface User {
    id: string;
    role: string;
}

interface EstimateItem {
    id: string;
    assembly_id?: string;
    is_manual: boolean;
    manual_assembly_type?: string;
    manual_pricing_type?: string;
    manual_descriptions?: string;
    quantity: number;
    material_price: number;
    labor_price: number;
    total_price: number;
}

interface EstimateFormProps {
    user: User;
    action: (
        formData: FormData,
    ) => Promise<{ ok: boolean; message?: string; estimateId?: string } | void>;
    estimateId?: string;
}

export default function EstimateForm({ user, action, estimateId }: EstimateFormProps) {
    const { toast } = useToast();
    const router = useRouter();

    const [inspectionId, setInspectionId] = useState<string>("");
    const [measurementSessionId, setMeasurementSessionId] = useState<string>("");
    const [isDraft, setIsDraft] = useState<boolean>(true);

    const [items, setItems] = useState<EstimateItem[]>([
        {
            id: Date.now().toString(),
            is_manual: false,
            quantity: 0,
            material_price: 0,
            labor_price: 0,
            total_price: 0,
        },
    ]);

    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [measurementSessions, setMeasurementSessions] = useState<MeasurementSession[]>([]);
    const [assemblies, setAssemblies] = useState<Assembly[]>([]);
    const [filteredAssemblies, setFilteredAssemblies] = useState<Assembly[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Загрузка данных
    // useEffect(() => {
    //     const fetchData = async () => {
    //         try {
    //             // Загрузка инспекций пользователя
    //             const { data: inspectionsData, error: inspectionsError } = await supabase
    //                 .from("inspections")
    //                 .select("id, inspection_name, address")
    //                 .eq("created_by", user.id)
    //                 .order("created_at", { ascending: false });
    //
    //             if (inspectionsError) throw inspectionsError;
    //
    //             setInspections(inspectionsData || []);
    //
    //             if (inspectionsData && inspectionsData.length > 0) {
    //                 setInspectionId(inspectionsData[0].id);
    //             }
    //
    //             // Загрузка сборок компании
    //             const { data: assembliesData, error: assembliesError } = await supabase
    //                 .from("assemblies")
    //                 .select("*")
    //                 .eq("is_active", true)
    //                 .order("assembly_name");
    //
    //             if (assembliesError) throw assembliesError;
    //
    //             setAssemblies(assembliesData || []);
    //             setFilteredAssemblies(assembliesData || []);
    //         } catch (error) {
    //             console.error("Error fetching data:", error);
    //             toast({
    //                 title: "Error",
    //                 description: "Failed to load data",
    //                 variant: "destructive",
    //             });
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };
    //
    //     fetchData();
    // }, [user.id]);

    // Загрузка сессий измерений при изменении инспекции
    // useEffect(() => {
    //     if (!inspectionId) return;
    //
    //     const fetchSessions = async () => {
    //         try {
    //             const { data: sessionsData, error: sessionsError } = await supabase
    //                 .from("measurement_sessions")
    //                 .select("id, session_name, created_at")
    //                 .eq("inspection_id", inspectionId)
    //                 .order("created_at", { ascending: false });
    //
    //             if (sessionsError) throw sessionsError;
    //
    //             setMeasurementSessions(sessionsData || []);
    //
    //             if (sessionsData && sessionsData.length > 0) {
    //                 setMeasurementSessionId(sessionsData[0].id);
    //             }
    //         } catch (error) {
    //             console.error("Error fetching measurement sessions:", error);
    //             toast({
    //                 title: "Error",
    //                 description: "Failed to load measurement sessions",
    //                 variant: "destructive",
    //             });
    //         }
    //     };
    //
    //     fetchSessions();
    // }, [inspectionId]);

    // Обновление цены при изменении количества или цен
    const updateItemPrice = (itemId: string, updates: Partial<EstimateItem>) => {
        setItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id !== itemId) return item;

                const updatedItem = { ...item, ...updates };

                // Пересчет общей цены
                const quantity = parseFloat(updatedItem.quantity?.toString() || "0") || 0;
                const materialPrice =
                    parseFloat(updatedItem.material_price?.toString() || "0") || 0;
                const laborPrice = parseFloat(updatedItem.labor_price?.toString() || "0") || 0;

                updatedItem.total_price = quantity * (materialPrice + laborPrice);

                return updatedItem;
            }),
        );
    };

    // Добавление нового элемента
    const addItem = () => {
        setItems([
            ...items,
            {
                id: Date.now().toString(),
                is_manual: false,
                quantity: 0,
                material_price: 0,
                labor_price: 0,
                total_price: 0,
            },
        ]);
    };

    // Удаление элемента
    const removeItem = (itemId: string) => {
        if (items.length <= 1) {
            toast({
                title: "Warning",
                description: "At least one item is required",
                variant: "warning",
            });
            return;
        }
        setItems(items.filter((item) => item.id !== itemId));
    };

    // Переключение между ручным и автоматическим режимом
    const toggleManualMode = (itemId: string, isManual: boolean) => {
        setItems((prevItems) =>
            prevItems.map((item) => {
                if (item.id !== itemId) return item;

                if (isManual) {
                    // Очистка данных сборки при переходе в ручной режим
                    return {
                        ...item,
                        is_manual: true,
                        assembly_id: undefined,
                        manual_assembly_type: "",
                        manual_pricing_type: "",
                        manual_descriptions: "",
                        material_price: 0,
                        labor_price: 0,
                        total_price: 0,
                    };
                } else {
                    // Очистка ручных данных при переходе в автоматический режим
                    return {
                        ...item,
                        is_manual: false,
                        manual_assembly_type: undefined,
                        manual_pricing_type: undefined,
                        manual_descriptions: undefined,
                        material_price: 0,
                        labor_price: 0,
                        total_price: 0,
                    };
                }
            }),
        );
    };

    // Расчет итоговых сумм
    const calculateTotals = () => {
        const totals = items.reduce(
            (acc, item) => {
                acc.material += item.material_price * item.quantity;
                acc.labor += item.labor_price * item.quantity;
                acc.total += item.total_price;
                return acc;
            },
            { material: 0, labor: 0, total: 0 },
        );

        return totals;
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.target as HTMLFormElement);

            // Добавление элементов сметы в форму
            items.forEach((item, index) => {
                formData.append(`items[${index}][is_manual]`, item.is_manual.toString());
                formData.append(`items[${index}][quantity]`, item.quantity.toString());
                formData.append(`items[${index}][material_price]`, item.material_price.toString());
                formData.append(`items[${index}][labor_price]`, item.labor_price.toString());
                formData.append(`items[${index}][total_price]`, item.total_price.toString());

                if (item.is_manual) {
                    formData.append(
                        `items[${index}][manual_assembly_type]`,
                        item.manual_assembly_type || "",
                    );
                    formData.append(
                        `items[${index}][manual_pricing_type]`,
                        item.manual_pricing_type || "",
                    );
                    formData.append(
                        `items[${index}][manual_descriptions]`,
                        item.manual_descriptions || "",
                    );
                } else if (item.assembly_id) {
                    formData.append(`items[${index}][assembly_id]`, item.assembly_id);
                }
            });

            const result = await action(formData);

            if (!result?.ok) {
                toast({
                    title: "Error",
                    description: result?.message || "Failed to save estimate",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Success",
                description: isDraft
                    ? "Draft saved successfully!"
                    : "Estimate created successfully!",
            });

            if (result.estimateId) {
                router.push(`/estimates/${result.estimateId}`);
            } else {
                router.push("/estimates");
            }
        } catch (error) {
            console.error("Submit error:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* HIDDEN FIELDS */}
            <input type="hidden" name="created_by" value={user.id} />
            <input type="hidden" name="is_draft" value={isDraft.toString()} />
            {estimateId && <input type="hidden" name="id" value={estimateId} />}

            {/* INSPECTION SELECTION */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <label className="block mb-3 text-lg font-medium text-gray-800">Inspection</label>
                {isLoading ? (
                    <div className="bg-gray-100 rounded-lg h-14 animate-pulse" />
                ) : inspections.length === 0 ? (
                    <div className="bg-gray-50 text-gray-500 rounded-lg p-4 text-center">
                        No inspections available. Please create an inspection first.
                    </div>
                ) : (
                    <select
                        name="inspection_id"
                        value={inspectionId}
                        onChange={(e) => {
                            setInspectionId(e.target.value);
                            setMeasurementSessionId("");
                        }}
                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                        required
                    >
                        <option value="">Select Inspection</option>
                        {inspections.map((inspection) => (
                            <option key={inspection.id} value={inspection.id} className="py-3">
                                {inspection.inspection_name} - {inspection.address}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* MEASUREMENT SESSION SELECTION */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <label className="block mb-3 text-lg font-medium text-gray-800">
                    Measurement Session
                </label>
                {isLoading ? (
                    <div className="bg-gray-100 rounded-lg h-14 animate-pulse" />
                ) : !inspectionId ? (
                    <div className="bg-gray-50 text-gray-500 rounded-lg p-4 text-center">
                        Please select an inspection first
                    </div>
                ) : measurementSessions.length === 0 ? (
                    <div className="bg-gray-50 text-gray-500 rounded-lg p-4 text-center">
                        No measurement sessions available for this inspection
                    </div>
                ) : (
                    <select
                        name="measurement_session_id"
                        value={measurementSessionId}
                        onChange={(e) => setMeasurementSessionId(e.target.value)}
                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                        required
                    >
                        <option value="">Select Measurement Session</option>
                        {measurementSessions.map((session) => (
                            <option key={session.id} value={session.id} className="py-3">
                                {session.session_name} -{" "}
                                {new Date(session.created_at).toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ESTIMATE ITEMS */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Estimate Items</h2>
                    <button
                        type="button"
                        onClick={addItem}
                        className="px-6 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors text-lg shadow-sm"
                    >
                        + Add Item
                    </button>
                </div>

                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                    >
                        <div className="flex justify-between items-start mb-5">
                            <h3 className="font-bold text-gray-800 text-lg">Item #{index + 1}</h3>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-500 hover:text-red-700 font-medium text-base px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        {/* MANUAL TOGGLE */}
                        <div className="mb-6">
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={item.is_manual}
                                        onChange={(e) =>
                                            toggleManualMode(item.id, e.target.checked)
                                        }
                                        className="sr-only"
                                    />
                                    <div
                                        className={`block w-14 h-8 rounded-full transition-colors ${
                                            item.is_manual ? "bg-blue-600" : "bg-gray-300"
                                        }`}
                                    ></div>
                                    <div
                                        className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                                            item.is_manual ? "transform translate-x-6" : ""
                                        }`}
                                    ></div>
                                </div>
                                <span className="ml-3 text-lg font-medium text-gray-700">
                                    {item.is_manual ? "Manual Entry" : "Select Assembly"}
                                </span>
                            </label>
                        </div>

                        {!item.is_manual ? (
                            // AUTOMATIC MODE - SELECT ASSEMBLY
                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 text-lg font-medium text-gray-800">
                                        Assembly
                                    </label>
                                    {assemblies.length === 0 ? (
                                        <div className="bg-gray-50 text-gray-500 rounded-lg p-4 text-center">
                                            No assemblies available. Please create assemblies first.
                                        </div>
                                    ) : (
                                        <select
                                            value={item.assembly_id || ""}
                                            onChange={(e) => {
                                                const assemblyId = e.target.value;
                                                const assembly = assemblies.find(
                                                    (a) => a.id === assemblyId,
                                                );
                                                if (assembly) {
                                                    updateItemPrice(item.id, {
                                                        assembly_id: assemblyId,
                                                        material_price: assembly.material_price,
                                                        labor_price: assembly.labor_price,
                                                    });
                                                }
                                            }}
                                            className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                                            required
                                        >
                                            <option value="">Select Assembly</option>
                                            {assemblies.map((assembly) => (
                                                <option
                                                    key={assembly.id}
                                                    value={assembly.id}
                                                    className="py-3"
                                                >
                                                    {assembly.assembly_name} - $
                                                    {assembly.material_price + assembly.labor_price}
                                                    /
                                                    {assembly.pricing_type
                                                        .replace("per_", "")
                                                        .replace("_", " ")}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-2 text-lg font-medium text-gray-800">
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateItemPrice(item.id, {
                                                quantity: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            // MANUAL MODE - CUSTOM FIELDS
                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 text-lg font-medium text-gray-800">
                                        Assembly Type
                                    </label>
                                    <input
                                        type="text"
                                        value={item.manual_assembly_type || ""}
                                        onChange={(e) =>
                                            updateItemPrice(item.id, {
                                                manual_assembly_type: e.target.value,
                                            })
                                        }
                                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        placeholder="e.g., Custom Repair, Setup Fee"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 text-lg font-medium text-gray-800">
                                        Pricing Type
                                    </label>
                                    <select
                                        value={item.manual_pricing_type || ""}
                                        onChange={(e) =>
                                            updateItemPrice(item.id, {
                                                manual_pricing_type: e.target.value,
                                            })
                                        }
                                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                                        required
                                    >
                                        <option value="">Select Pricing Type</option>
                                        <option value="per_square">Per Square</option>
                                        <option value="per_sq_ft">Per Sq Ft</option>
                                        <option value="per_linear_ft">Per Linear Ft</option>
                                        <option value="flat_rate">Flat Rate</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block mb-2 text-lg font-medium text-gray-800">
                                        Description
                                    </label>
                                    <textarea
                                        value={item.manual_descriptions || ""}
                                        onChange={(e) =>
                                            updateItemPrice(item.id, {
                                                manual_descriptions: e.target.value,
                                            })
                                        }
                                        className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white min-h-[100px]"
                                        placeholder="Enter detailed description of the work"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block mb-2 text-lg font-medium text-gray-800">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateItemPrice(item.id, {
                                                    quantity: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 text-lg font-medium text-gray-800">
                                            Material Price
                                        </label>
                                        <input
                                            type="number"
                                            value={item.material_price}
                                            onChange={(e) =>
                                                updateItemPrice(item.id, {
                                                    material_price: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 text-lg font-medium text-gray-800">
                                            Labor Price
                                        </label>
                                        <input
                                            type="number"
                                            value={item.labor_price}
                                            onChange={(e) =>
                                                updateItemPrice(item.id, {
                                                    labor_price: parseFloat(e.target.value) || 0,
                                                })
                                            }
                                            className="w-full py-4 px-5 text-lg rounded-xl border border-gray-300 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ITEM TOTAL */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-600">
                                    Item Total:
                                </span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ${item.total_price.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* SUMMARY */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 shadow-sm border border-blue-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Summary</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                        <span className="text-gray-600">Material Total:</span>
                        <span className="font-semibold">${totals.material.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                        <span className="text-gray-600">Labor Total:</span>
                        <span className="font-semibold">${totals.labor.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg pt-3 border-t border-blue-300">
                        <span className="font-bold text-gray-800">Grand Total:</span>
                        <span className="text-3xl font-bold text-blue-600">
                            ${totals.total.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    type="button"
                    onClick={() => {
                        setIsDraft(true);
                        handleSubmit({
                            preventDefault: () => {},
                            target: document.querySelector("form"),
                        } as any);
                    }}
                    disabled={isSubmitting}
                    className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                        isSubmitting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                >
                    {isSubmitting ? "Saving..." : "💾 Save Draft"}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setIsDraft(false);
                        handleSubmit({
                            preventDefault: () => {},
                            target: document.querySelector("form"),
                        } as any);
                    }}
                    disabled={isSubmitting}
                    className={`flex-1 py-5 rounded-xl font-bold text-lg transition-all ${
                        isSubmitting
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                >
                    {isSubmitting ? "Creating..." : "✅ Finalize Estimate"}
                </button>
            </div>
        </form>
    );
}
