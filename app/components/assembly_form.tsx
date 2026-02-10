"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useToast } from "@/app/components/providers/toast-provider";
import { useRouter } from "next/navigation";

interface AssemblyCategory {
    id: string;
    category_name: string;
    type_name: "roofing" | "siding";
}

interface AssemblyCompany {
    id: string;
    company_name: string;
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
    assembly_company: string;
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

type AssemblyType = "roofing" | "siding";

export default function AssemblyForm({ user, action, assembly }: AssemblyFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [assemblyName, setAssemblyName] = useState<string>(assembly?.assembly_name || "");
    const [assemblyType, setAssemblyType] = useState<AssemblyType>(
        (assembly?.assembly_type as AssemblyType) || "roofing",
    );
    const [assemblyCategory, setAssemblyCategory] = useState<string>(
        assembly?.assembly_category || "",
    );
    const [assemblyCompany, setAssemblyCompany] = useState<string>(
        assembly?.assembly_company || "",
    );
    const [pricingType, setPricingType] = useState<string>(assembly?.pricing_type || "");
    const [materialPrice, setMaterialPrice] = useState<string>(
        assembly?.material_price?.toString() || "",
    );
    const [laborPrice, setLaborPrice] = useState<string>(assembly?.labor_price?.toString() || "");
    const [isActive, setIsActive] = useState<boolean>(assembly?.is_active || false);
    const [categories, setCategories] = useState<AssemblyCategory[]>([]);
    const [companies, setCompanies] = useState<AssemblyCompany[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filteredCategories, setFilteredCategories] = useState<AssemblyCategory[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: categoriesData, error: categoriesError } = await supabase
                    .from("assembly_categories")
                    .select("id, category_name, type_name")
                    .order("category_name");

                if (categoriesError) throw categoriesError;

                const { data: companiesData, error: companiesError } = await supabase
                    .from("assembly_companies")
                    .select("id, company_name")
                    .order("company_name");

                if (companiesError) throw companiesError;

                setCategories(categoriesData || []);
                setCompanies(companiesData || []);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({
                    title: "Error",
                    description: "Failed to load assembly data",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const filtered = categories.filter((cat) => cat.type_name === assemblyType);
        setFilteredCategories(filtered);
    }, [assemblyType, categories, assemblyCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);
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
                <select
                    name="assembly_type"
                    value={assemblyType}
                    onChange={(e) => setAssemblyType(e.target.value as AssemblyType)}
                    className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                >
                    <option value="roofing">Roofing</option>
                    <option value="siding">Siding</option>
                </select>
            </div>

            {/* COMPANY */}
            <div>
                <label className="block mb-2 text-lg font-medium">Company</label>
                {isLoading ? (
                    <div className="bg-gray-100 rounded-lg h-12 animate-pulse" />
                ) : companies.length === 0 ? (
                    <div className="bg-gray-100 text-gray-500 rounded-lg p-4">
                        No companies available. Please create companies first.
                    </div>
                ) : (
                    <select
                        name="assembly_company"
                        value={assemblyCompany}
                        onChange={(e) => setAssemblyCompany(e.target.value)}
                        className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id} className="py-2">
                                {company.company_name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* CATEGORY */}
            <div>
                <label className="block mb-2 text-lg font-medium">Category</label>
                {isLoading ? (
                    <div className="bg-gray-100 rounded-lg h-12 animate-pulse" />
                ) : filteredCategories.length === 0 ? (
                    <div className="bg-gray-100 text-gray-500 rounded-lg p-4">
                        No categories available for {assemblyType}. Please create categories first.
                    </div>
                ) : (
                    <select
                        name="assembly_category"
                        value={assemblyCategory}
                        onChange={(e) => setAssemblyCategory(e.target.value)}
                        className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select Category</option>
                        {filteredCategories.map((cat) => (
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
                <select
                    name="pricing_type"
                    value={pricingType}
                    onChange={(e) => setPricingType(e.target.value)}
                    className="select w-full text-lg py-3 px-4 rounded-lg appearance-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                >
                    <option value="">Select Pricing Type</option>
                    <option value="per_square">Per Square</option>
                    <option value="per_sq_ft">Per Sq Ft</option>
                    <option value="per_linear_ft">Per Linear Ft</option>
                </select>
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
