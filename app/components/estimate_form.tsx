"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useToast } from "@/app/components/providers/toast-provider";
import { useRouter } from "next/navigation";

interface Inspection {
    id: string;
    date: string;
    properties: {
        id: string;
        name: string | null;
        address: string | null;
    } | null;
    users: {
        name: string | null;
    } | null;
}

interface MeasurementSession {
    id: string;
    date: string;
    properties: {
        id: string;
        name: string | null;
        address: string | null;
    } | null;
    users: {
        name: string | null;
    } | null;
}

interface Assembly {
    id: string;
    assembly_name: string;
    assembly_type: "roofing" | "siding";
    pricing_type: "per_square" | "per_sq_ft" | "per_linear_ft";
    material_price: number;
    labor_price: number;
    is_active: boolean;
    assembly_categories: { category_name: string | null } | null;
    assembly_companies: { company_name: string | null } | null;
}

interface Estimate {
    id?: string;
    inspection_id?: string;
    measurement_session_id?: string;
    is_finalize?: boolean;
}

interface EstimateItem {
    id?: string;
    assembly_id?: string;
    manual_assembly_type?: "roofing" | "siding";
    manual_pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft";
    manual_material_price?: number;
    manual_labor_price?: number;
    manual_descriptions?: string;
    is_manual?: boolean;
}

interface EstimateFormProps {
    user: { id: string; role: string };
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string } | void>;
    estimate?: Estimate;
}

export default function EstimateForm({ user, action, estimate }: EstimateFormProps) {
    const { toast } = useToast();
    const router = useRouter();

    // Form state
    const [inspectionId, setInspectionId] = useState<string>("");
    const [measurementSessionId, setMeasurementSessionId] = useState<string>("");
    const [assemblies, setAssemblies] = useState<Assembly[]>([]);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [measurementSessions, setMeasurementSessions] = useState<MeasurementSession[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isFinalized, setIsFinalized] = useState<boolean>(estimate?.is_finalize || false);
    const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([]);
    const [newManualItem, setNewManualItem] = useState<Omit<EstimateItem, "is_manual">>({
        manual_assembly_type: "roofing",
        manual_pricing_type: "per_sq_ft",
        manual_material_price: 0,
        manual_labor_price: 0,
        manual_descriptions: "",
    });

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: inspectionsData, error: inspError } = await supabase
                    .from("inspections")
                    .select(
                        "id, date, properties!property_id(id, name, address), users!inspector_id(name)",
                    )
                    .order("created_at", { ascending: false });

                if (inspError) throw inspError;

                const { data: assembliesData, error: asmError } = await supabase
                    .from("assemblies")
                    .select(
                        "id, assembly_name, assembly_type, pricing_type, material_price, labor_price, is_active, assembly_categories!assembly_category(category_name), assembly_companies!company_id(company_name)",
                    )
                    .eq("is_active", true);

                if (asmError) throw asmError;

                // setInspections(inspectionsData || []);
                const normalizedInspectionsData = (inspectionsData || []).map((insp) => ({
                    id: insp.id,
                    date: insp.date,
                    properties: Array.isArray(insp.properties)
                        ? insp.properties.length > 0
                            ? insp.properties[0]
                            : null
                        : insp.properties,
                    users: Array.isArray(insp.users)
                        ? insp.users.length > 0
                            ? insp.users[0]
                            : null
                        : insp.users,
                }));

                setInspections(normalizedInspectionsData);

                const normalizedAssembliesData = (assembliesData || []).map((asm) => ({
                    id: asm.id,
                    assembly_name: asm.assembly_name,
                    assembly_type: asm.assembly_type,
                    pricing_type: asm.pricing_type,
                    material_price: asm.material_price,
                    labor_price: asm.labor_price,
                    is_active: asm.is_active,
                    assembly_categories: Array.isArray(asm.assembly_categories)
                        ? asm.assembly_categories.length > 0
                            ? asm.assembly_categories[0]
                            : null
                        : asm.assembly_categories,
                    assembly_companies: Array.isArray(asm.assembly_companies)
                        ? asm.assembly_companies.length > 0
                            ? asm.assembly_companies[0]
                            : null
                        : asm.assembly_companies,
                }));

                setAssemblies(normalizedAssembliesData || []);
            } catch (error) {
                console.error("Error fetching inspections/assemblies:", error);
                toast({
                    title: "Error",
                    description: "Failed to load inspections or assemblies",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Load measurement sessions when inspection selected
    useEffect(() => {
        const fetchSessions = async () => {
            const { data, error } = await supabase
                .from("measurement_sessions")
                .select(
                    "id, date, properties!property_id(id, name, address), users!created_by(name)",
                )
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error loading sessions:", error);
                toast({
                    title: "Error",
                    description: "Failed to load measurement sessions",
                    variant: "destructive",
                });
                return;
            }

            const normalizedData = (data || []).map((sess) => ({
                id: sess.id,
                date: sess.date,
                properties: Array.isArray(sess.properties)
                    ? sess.properties.length > 0
                        ? sess.properties[0]
                        : null
                    : sess.properties,
                users: Array.isArray(sess.users)
                    ? sess.users.length > 0
                        ? sess.users[0]
                        : null
                    : sess.users,
            }));

            setMeasurementSessions(normalizedData || []);
            // Optionally auto-select first session if only one
            if (data && data.length === 1) {
                setMeasurementSessionId(data[0].id);
            }
        };

        fetchSessions();
    }, []);

    // Handlers
    const handleAddFromAssembly = (e: React.FormEvent) => {
        e.preventDefault();
        if (!measurementSessionId || !inspectionId) return;

        const assembly = assemblies.find(
            (a) => a.id === e.currentTarget.getAttribute("data-assembly-id"),
        );
        if (!assembly) return;

        const newItem: EstimateItem = {
            assembly_id: assembly.id,
            manual_assembly_type: assembly.assembly_type,
            manual_pricing_type: assembly.pricing_type,
            manual_material_price: assembly.material_price,
            manual_labor_price: assembly.labor_price,
            manual_descriptions: "",
            is_manual: false,
        };

        setEstimateItems([...estimateItems, newItem]);
        toast({
            title: "Added",
            description: `${assembly.assembly_name} added to estimate`,
        });
    };

    const handleAddManualItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!measurementSessionId || !inspectionId) return;

        const item: EstimateItem = {
            ...newManualItem,
            is_manual: true,
        };

        setEstimateItems([...estimateItems, item]);
        toast({
            title: "Added",
            description: "Manual line item added",
        });
        // Reset form
        setNewManualItem({
            manual_assembly_type: "roofing",
            manual_pricing_type: "per_sq_ft",
            manual_material_price: 0,
            manual_labor_price: 0,
            manual_descriptions: "",
        });
    };

    const handleRemoveItem = (index: number) => {
        setEstimateItems(estimateItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        console.log("formData", formData);
        // Append estimate items manually
        estimateItems.forEach((item, idx) => {
            formData.append(`items[${idx}][assembly_id]`, item.assembly_id || "");
            formData.append(`items[${idx}][manual_assembly_type]`, item.manual_assembly_type || "");
            formData.append(`items[${idx}][manual_pricing_type]`, item.manual_pricing_type || "");
            formData.append(
                `items[${idx}][material_price]`,
                String(item.manual_material_price || null),
            );
            formData.append(
                `items[${idx}][manual_labor_price]`,
                String(item.manual_labor_price || null),
            );
            formData.append(`items[${idx}][manual_descriptions]`, item.manual_descriptions || "");
            formData.append(`items[${idx}][is_manual]`, String(item.is_manual || false));
        });

        const result = await action(formData);
        console.log("handleSubmit formData", formData);
        console.log("result", result);

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
            description: "Estimate saved successfully!",
        });

        if (estimate) {
            router.push(`/estimates/${estimate.id}`);
        } else {
            router.push("/estimates");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* INSPECTION */}
            <div>
                <label className="block mb-2 text-lg font-medium">Inspection</label>
                {isLoading ? (
                    <div className="bg-gray-800 rounded-lg h-12 animate-pulse" />
                ) : inspections.length === 0 ? (
                    <div className="bg-gray-800 text-gray-500 rounded-lg p-4">
                        No inspections available. Please create an inspection first.
                    </div>
                ) : (
                    <select
                        name="inspection_id"
                        value={inspectionId}
                        onChange={(e) => setInspectionId(e.target.value)}
                        className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                        required
                    >
                        <option value="">Select Inspection</option>
                        {inspections.map((insp) => (
                            <option key={insp.id} value={insp.id} className="py-2">
                                {insp.properties?.name}•{insp.properties?.address}•
                                {insp.users?.name} ({new Date(insp.date).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* MEASUREMENT SESSION */}
            <div>
                <label className="block mb-2 text-lg font-medium">Measurement Session</label>
                {isLoading ? (
                    <div className="bg-gray-800 rounded-lg h-12 animate-pulse" />
                ) : measurementSessions.length === 0 ? (
                    <div className="bg-gray-800 text-gray-500 rounded-lg p-4">
                        {/*{inspectionId*/}
                        {/*    ? " for this inspection."*/}
                        {/*    : "Select an inspection first."}*/}
                        No measurement sessions.
                    </div>
                ) : (
                    <select
                        name="measurement_session_id"
                        value={measurementSessionId}
                        onChange={(e) => setMeasurementSessionId(e.target.value)}
                        className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                        required
                    >
                        <option value="">Select Session</option>
                        {measurementSessions.map((sess) => (
                            <option key={sess.id} value={sess.id} className="py-2">
                                {sess.properties?.name}•{sess.properties?.address}•
                                {sess.users?.name} ({new Date(sess.date).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ADD FROM ASSEMBLY */}
            <div>
                <h3 className="text-xl font-semibold mb-3">Add Line Item from Assembly</h3>
                {isLoading ? (
                    <div className="bg-gray-800 rounded-lg h-12 animate-pulse" />
                ) : assemblies.length === 0 ? (
                    <div className="bg-gray-800 text-gray-500 rounded-lg p-4">
                        No active assemblies available. Please create assemblies first.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assemblies.map((asm) => (
                            <button
                                key={asm.id}
                                type="button"
                                data-assembly-id={asm.id}
                                onClick={handleAddFromAssembly}
                                className="w-full text-left py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors text-lg"
                            >
                                {asm.assembly_name} — {asm.assembly_type} •{" "}
                                {asm.assembly_categories?.category_name} • $
                                {(asm.material_price + asm.labor_price).toFixed(2)}/
                                {asm.pricing_type.replace(/_/g, " ")} (
                                {asm.assembly_companies?.company_name})
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD MANUAL ITEM */}
            <div>
                <h3 className="text-xl font-semibold mb-3">Add Manual Line Item</h3>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium">Assembly Type</label>
                            <select
                                value={newManualItem.manual_assembly_type}
                                onChange={(e) =>
                                    setNewManualItem({
                                        ...newManualItem,
                                        manual_assembly_type: e.target.value as
                                            | "roofing"
                                            | "siding",
                                    })
                                }
                                className="select w-full py-2 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white"
                            >
                                <option value="roofing">Roofing</option>
                                <option value="siding">Siding</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">Pricing Type</label>
                            <select
                                value={newManualItem.manual_pricing_type}
                                onChange={(e) =>
                                    setNewManualItem({
                                        ...newManualItem,
                                        manual_pricing_type: e.target.value as any,
                                    })
                                }
                                className="select w-full py-2 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white"
                            >
                                <option value="per_square">Per Square</option>
                                <option value="per_sq_ft">Per Sq Ft</option>
                                <option value="per_linear_ft">Per Linear Ft</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">Material Price</label>
                            <input
                                type="number"
                                value={newManualItem.manual_material_price}
                                onChange={(e) =>
                                    setNewManualItem({
                                        ...newManualItem,
                                        manual_material_price: parseFloat(e.target.value) || 0,
                                    })
                                }
                                min="0"
                                step="0.01"
                                className="input w-full py-2 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">Labor Price</label>
                            <input
                                type="number"
                                value={newManualItem.manual_labor_price}
                                onChange={(e) =>
                                    setNewManualItem({
                                        ...newManualItem,
                                        manual_labor_price: parseFloat(e.target.value) || 0,
                                    })
                                }
                                min="0"
                                step="0.01"
                                className="input w-full py-2 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">
                                Notes (optional)
                            </label>
                            <input
                                type="text"
                                value={newManualItem.manual_descriptions}
                                onChange={(e) =>
                                    setNewManualItem({
                                        ...newManualItem,
                                        manual_descriptions: e.target.value,
                                    })
                                }
                                className="input w-full py-2 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white"
                                placeholder="e.g., misc repair"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="btn w-full py-3 text-lg rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
                    >
                        ➕ Add Manual Line Item
                    </button>
                </div>
            </div>

            {/* ESTIMATE ITEMS LIST */}
            {estimateItems.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-3">
                        Estimate Items ({estimateItems.length})
                    </h3>
                    <div className="space-y-3">
                        {estimateItems.map((item, idx) => (
                            <div
                                key={idx}
                                className="border border-gray-600 rounded-lg p-4 bg-gray-800/50"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium">
                                            {item.is_manual
                                                ? "Manual Item"
                                                : assemblies.find((a) => a.id === item.assembly_id)
                                                      ?.assembly_name || "—"}
                                        </div>
                                        {item.manual_descriptions && (
                                            <div className="text-sm text-gray-300 mt-1 italic">
                                                {item.manual_descriptions}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(idx)}
                                        className="text-red-400 hover:text-red-300 text-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="mt-2 flex justify-between text-sm">
                                    <span>
                                        Material: $
                                        {item.manual_material_price?.toFixed(2) || "0.00"} • Labor:
                                        ${item.manual_labor_price?.toFixed(2) || "0.00"}
                                    </span>
                                    <span className="font-semibold">
                                        Total: $
                                        {item.manual_material_price! + item.manual_labor_price!}
                                        .00
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE STATUS */}
            <div className="flex items-center mt-2">
                <input
                    type="checkbox"
                    id="is_finalized"
                    name="is_finalized"
                    checked={isFinalized}
                    onChange={(e) => setIsFinalized(e.target.checked)}
                    className="h-6 w-6 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_finalized" className="ml-3 text-lg font-medium">
                    Finalized
                </label>
            </div>

            {/* SUBMIT */}
            <button
                type="submit"
                disabled={!measurementSessionId || estimateItems.length === 0}
                className={`btn w-full mt-6 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    !measurementSessionId || estimateItems.length === 0
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                }`}
            >
                Create Estimate
            </button>
        </form>
    );
}
