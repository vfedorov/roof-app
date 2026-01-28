"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useToast } from "@/app/components/providers/toast-provider";
import { useRouter } from "next/navigation";

interface AssemblyCategory {
    id: string;
    category_name: string;
}

interface User {
    id: string;
    role: string;
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

interface AssemblyFormProps {
    user: User;
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string } | void>;
    assembly?: Assembly;
}

export default function AssemblyForm({ user, action, assembly }: AssemblyFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [assemblyName, setAssemblyName] = useState<string>(assembly?.assembly_name || "");
    const [assemblyType, setAssemblyType] = useState<string>(assembly?.assembly_type || "");
    const [assemblyCategory, setAssemblyCategory] = useState<string>(
        assembly?.assembly_category || "",
    );
    const [pricingType, setPricingType] = useState<string>(assembly?.pricing_type || "");
    const [materialPrice, setMaterialPrice] = useState<string>(
        assembly?.material_price?.toString() || "",
    );
    const [laborPrice, setLaborPrice] = useState<string>(assembly?.labor_price?.toString() || "");
    const [isActive, setIsActive] = useState<boolean>(assembly?.is_active || false);
    const [categories, setCategories] = useState<AssemblyCategory[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from("assembly_categories")
                    .select("id, category_name")
                    .order("category_name");

                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error("Error fetching categories:", error);
                toast({
                    title: "Error",
                    description: "Failed to load assembly categories",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);

        // Add company_id from user context
        formData.append("company_id", user.id);

        const result = await action(formData);
        if (!result?.ok) {
            toast({
                title: "Error",
                description: result?.message || "Failed to save assembly",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Success",
            description: "Assembly saved successfully!",
        });

        if (assembly) {
            router.push(`/assemblies/${assembly.id}`);
        } else {
            router.push("/assemblies");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ASSEMBLY NAME */}
            <div>
                <label className="block mb-2 text-lg font-medium">Assembly Name</label>
                <input
                    type="text"
                    name="assembly_name"
                    value={assemblyName}
                    onChange={(e) => setAssemblyName(e.target.value)}
                    className="input w-full text-lg py-3 px-4 rounded-lg"
                    placeholder="Enter assembly name"
                    required
                    autoFocus
                />
            </div>

            {/* ASSEMBLY TYPE */}
            <div>
                <label className="block mb-2 text-lg font-medium">Assembly Type</label>
                <input
                    type="text"
                    name="assembly_type"
                    value={assemblyType}
                    onChange={(e) => setAssemblyType(e.target.value)}
                    className="input w-full text-lg py-3 px-4 rounded-lg"
                    placeholder="e.g. Kitchen Cabinet"
                    required
                />
            </div>

            {/* CATEGORY */}
            <div>
                <label className="block mb-2 text-lg font-medium">Category</label>
                {isLoading ? (
                    <div className="bg-gray-100 rounded-lg h-12 animate-pulse" />
                ) : (
                    <select
                        name="assembly_category"
                        value={assemblyCategory}
                        onChange={(e) => setAssemblyCategory(e.target.value)}
                        className="select w-full text-lg py-3 px-4 rounded-lg appearance-none bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id} className="py-2">
                                {cat.category_name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* PRICING TYPE */}
            <div>
                <label className="block mb-2 text-lg font-medium">Pricing Type</label>
                <input
                    type="text"
                    name="pricing_type"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    className="input w-full text-lg py-3 px-4 rounded-lg"
                    placeholder="e.g. Per Unit, Hourly"
                    required
                />
            </div>

            {/* PRICES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block mb-2 text-lg font-medium">Material Price</label>
                    <input
                        type="number"
                        name="material_price"
                        value={materialPrice}
                        onChange={(e) => setMaterialPrice(e.target.value)}
                        className="input w-full text-lg py-3 px-4 rounded-lg"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                    />
                </div>

                <div>
                    <label className="block mb-2 text-lg font-medium">Labor Price</label>
                    <input
                        type="number"
                        name="labor_price"
                        value={laborPrice}
                        onChange={(e) => setLaborPrice(e.target.value)}
                        className="input w-full text-lg py-3 px-4 rounded-lg"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                    />
                </div>
            </div>

            {/* ACTIVE STATUS */}
            <div className="flex items-center mt-2">
                <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-6 w-6 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-3 text-lg font-medium">
                    Active Assembly
                </label>
            </div>

            {assembly && <input type="hidden" name="id" value={assembly.id} />}

            {/* SUBMIT */}
            <button
                type="submit"
                className="btn w-full mt-6 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                {assembly ? "Update Assembly" : "Create Assembly"}
            </button>
        </form>
    );
}
