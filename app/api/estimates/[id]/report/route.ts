import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import puppeteerCore from "puppeteer-core";
import * as os from "node:os";
import {
    calculateEstimateCosts,
    extractDimensions,
    ShapeDimension,
} from "@/lib/estimates/calculateCost";

// --- CONFIGURATION ---
const MAX_PHOTOS_PER_ESTIMATE = 6; // Define as needed for estimates
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

// URL recommended by Sparticuz (works on Vercel)
const CHROMIUM_TAR_URL =
    "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar"; // Ensure this is correct

// --- TYPES ---
type MeasurementShape = {
    id: string;
    surface_type: string;
    shape_type: "polygon" | "line";
    waste_percentage?: number | null;
    magnitude?: string | null;
    label?: string;
};

type MeasurementImage = {
    id: string;
    image_url: string;
    is_base_image: boolean;
};

type AssemblyCategory = {
    id: string;
    category_name: string;
};

type Assembly = {
    id?: string;
    assembly_name: string;
    assembly_type?: "roofing" | "siding";
    pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft";
    material_price?: number | null;
    labor_price?: number | null;
    is_active?: boolean;
    assembly_category?: AssemblyCategory;
};

type EstimateItem = {
    id?: string;
    assembly_id?: string;
    manual_assembly_type?: "roofing" | "siding";
    manual_pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft";
    manual_material_price?: number | null;
    manual_labor_price?: number | null;
    manual_descriptions?: string;
    is_manual?: boolean;
    // Add other fields as they might be fetched, e.g., from joined assemblies table
    // assembly_name?: string; // Fetched from assemblies table join
    // assembly_type?: "roofing" | "siding"; // Fetched from assemblies table join
    // pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft"; // Fetched from assemblies table join
    // material_price?: number; // Fetched from assemblies table join
    // labor_price?: number; // Fetched from assemblies table join
    assemblies?: Assembly;
    shape_id?: string;
};

type EstimateWithDetails = {
    id?: string;
    inspection_id?: string;
    measurement_session_id?: string;
    is_finalize?: boolean;
    created_at?: string;
    updated_at?: string;
    // Joined data
    inspections?: {
        date: string;
        summary_notes: string;
        roof_type: string;
        properties?: { name: string | null; address: string | null };
        users?: { name: string | null };
    };
    measurement_sessions?: {
        date: string;
        properties?: { name: string | null; address: string | null };
        users?: { name: string | null };
        measurement_shapes?: MeasurementShape[];
        measurement_images?: MeasurementImage[];
    };
    estimate_items?: EstimateItem[];
    // Add other joined relations if needed
};

interface MeasurementSummary {
    roof: {
        totalAreaSqFt: number;
        totalSquares: number;
    };
    siding: {
        totalAreaSqFt: number;
    };
    linear: {
        ridge: number;
        eave: number;
        trim: number;
        other: number;
    };
    otherAreaSqFt: number;
    images: string[]; // Added for PDF
}
// --- HELPER FUNCTIONS ---

// ---------------------------------------------------------------------------
// DOWNLOAD + CACHE chromium-min ON VERCEL
// ---------------------------------------------------------------------------
async function getVercelChromiumPath(): Promise<string> {
    if (cachedExecutablePath) return cachedExecutablePath;

    if (!downloadPromise) {
        const chromium = (await import("@sparticuz/chromium-min")).default;

        downloadPromise = chromium
            .executablePath(CHROMIUM_TAR_URL)
            .then((path) => {
                cachedExecutablePath = path;
                console.log("Chromium executable (Vercel):", path);
                return path;
            })
            .catch((err) => {
                console.error("❌ Failed to fetch chromium-min:", err);
                downloadPromise = null;
                throw err;
            });
    }

    return downloadPromise;
}

// ---------------------------------------------------------------------------
// MASTER FUNCTION USED BY PDF GENERATOR
// ---------------------------------------------------------------------------
async function getBrowser() {
    const isLocal = process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT !== "production";
    const platform = os.platform();
    const isWindows = platform === "win32";

    //
    // 1) LOCAL WINDOWS — Use installed Chrome
    //
    if (isLocal && isWindows) {
        const localChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

        return puppeteerCore.launch({
            headless: true,
            executablePath: localChromePath,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    //
    // 2) LOCAL MAC / LINUX — Try global Chrome
    //
    if (isLocal && !isWindows) {
        return puppeteerCore.launch({
            headless: true,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            args: ["--no-sandbox"],
        });
    }

    //
    // 3) VERCEL — chromium-min from GitHub URL
    //
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const executablePath = await getVercelChromiumPath();

    console.log("Launching puppeteer-core with chromium-min on Vercel...");
    console.log("Executable:", executablePath);

    return puppeteerCore.launch({
        headless: true,
        executablePath,
        args: chromium.args,
    });
}

function computeMeasurementSummary(
    shapesD: ShapeDimension[],
    measurement_images: MeasurementImage[],
): MeasurementSummary {
    const DAMAGE_TYPES = new Set(["roof damage", "siding damage"]);
    const LINEAR_TYPES = new Set(["trim", "ridge", "eave", "other"]);
    const ROOF_AREA_TYPES = new Set(["roof area"]);
    const SIDING_AREA_TYPES = new Set(["siding area"]);

    let roofArea = 0;
    let sidingArea = 0;
    let otherArea = 0;

    const linearTotals = {
        ridge: 0,
        eave: 0,
        trim: 0,
        other: 0,
    };

    const images = measurement_images
        .filter((img) => img.image_url)
        .sort((a, b) => {
            if (a.is_base_image && !b.is_base_image) return -1;
            if (!a.is_base_image && b.is_base_image) return 1;
            return 0;
        })
        .slice(0, MAX_PHOTOS_PER_ESTIMATE)
        .map((img) => img.image_url);

    for (const shapeD of shapesD) {
        if (DAMAGE_TYPES.has(shapeD.surface_type)) continue;

        if (shapeD.shape_type === "polygon") {
            const area = shapeD.magnitude ?? 0;
            if (ROOF_AREA_TYPES.has(shapeD.surface_type)) {
                roofArea += area;
            } else if (SIDING_AREA_TYPES.has(shapeD.surface_type)) {
                sidingArea += area;
            } else {
                otherArea += area;
            }
        } else if (shapeD.shape_type === "line") {
            const length = shapeD.magnitude ?? 0;
            if (LINEAR_TYPES.has(shapeD.surface_type)) {
                linearTotals[shapeD.surface_type as keyof typeof linearTotals] += length;
            }
        }
    }

    return {
        roof: {
            totalAreaSqFt: parseFloat(roofArea.toFixed(2)),
            totalSquares: parseFloat((roofArea / 100).toFixed(2)),
        },
        siding: {
            totalAreaSqFt: parseFloat(sidingArea.toFixed(2)),
        },
        linear: {
            ridge: parseFloat(linearTotals.ridge.toFixed(2)),
            eave: parseFloat(linearTotals.eave.toFixed(2)),
            trim: parseFloat(linearTotals.trim.toFixed(2)),
            other: parseFloat(linearTotals.other.toFixed(2)),
        },
        otherAreaSqFt: parseFloat(otherArea.toFixed(2)),
        images,
    };
}
// --- MAIN HANDLER ---

// ------------------------------------------------------------
// GET — Generate Estimate PDF
// ------------------------------------------------------------
export async function GET(request: NextRequest, context: any) {
    const { id } = await context.params;

    // --- 1. LOAD ESTIMATE DATA ---
    const { data: estimate, error: estimateError } = await supabaseServer
        .from("estimates")
        .select(
            `
        *,
        inspections!inspection_id(
            date,
            summary_notes,
            roof_type,
            properties(name, address),
            users(name)
        ),
        measurement_sessions!measurement_session_id(
            date,
            properties(name, address),
            users(name),
            measurement_shapes!measurement_session_id(
                id,
                surface_type,
                shape_type,
                waste_percentage,
                magnitude,
                label
            ),
            measurement_images!measurement_session_id(id, image_url, is_base_image)
        ),
        estimate_items!estimate_id(
            *,
            assemblies!assembly_id(
                assembly_name,
                assembly_type,
                pricing_type,
                material_price,
                labor_price,
                is_active,
                assembly_categories!assembly_category(category_name)
            )
        )
    `,
        )
        .eq("id", id)
        .single();

    if (estimateError || !estimate) {
        console.error("Error fetching estimate:", estimateError);
        return NextResponse.json(
            { error: "Estimate not found or error occurred" },
            { status: 404 },
        );
    }

    const shapes = estimate.measurement_sessions?.measurement_shapes || [];
    const images = estimate.measurement_sessions?.measurement_images || [];
    const shapeDimension = extractDimensions(shapes);
    const measurementSummary = computeMeasurementSummary(shapeDimension, images);

    // Рассчитываем стоимость каждой строки
    const lineItemCosts = calculateEstimateCosts(estimate.estimate_items || [], shapes);

    // Суммируем итоги
    const totalMaterialCost = lineItemCosts.reduce((sum, item) => sum + item.materialCost, 0);
    const totalLaborCost = lineItemCosts.reduce((sum, item) => sum + item.laborCost, 0);
    const totalCost = lineItemCosts.reduce((sum, item) => sum + item.totalCost, 0);

    // --- 4. BUILD HTML ---
    const categoryTotals = aggregateCostsByCategory(lineItemCosts, estimate.estimate_items, shapes);

    const html = buildEstimateHtml(
        estimate,
        { totalMaterialCost, totalLaborCost, totalCost },
        measurementSummary,
        lineItemCosts,
        shapes,
        categoryTotals,
    );

    // --- 5. GENERATE PDF ---
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1800 }); // Adjust viewport as needed

    await page.setContent(html, { waitUntil: "networkidle0" }); // Wait for resources if needed

    const pdf = await page.pdf({
        format: "A4", // Or Letter
        printBackground: true,
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm",
        },
    });

    await browser.close();

    const arrayBuffer = new Uint8Array(pdf).buffer;

    return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename=estimate-${estimate.measurement_sessions?.properties.name.replace(/ /g, "_")}-${new Date(estimate.created_at).toISOString().split("T")[0]}.pdf`,
        },
    });
}

// ------------------------------------------------------------
// AGGREGATE COSTS BY CATEGORY (Roof, Siding, Linear)
// ------------------------------------------------------------
interface CategoryTotals {
    roof: { material: number; labor: number; total: number };
    siding: { material: number; labor: number; total: number };
    linear: { material: number; labor: number; total: number };
}

function aggregateCostsByCategory(
    lineItemCosts: { materialCost: number; laborCost: number; totalCost: number }[],
    estimateItems: EstimateItem[] | undefined,
    measurementShapes: MeasurementShape[],
): CategoryTotals {
    const totals: CategoryTotals = {
        roof: { material: 0, labor: 0, total: 0 },
        siding: { material: 0, labor: 0, total: 0 },
        linear: { material: 0, labor: 0, total: 0 },
    };

    if (!estimateItems) return totals;

    for (let i = 0; i < estimateItems.length; i++) {
        const item = estimateItems[i];
        const cost = lineItemCosts[i] || { materialCost: 0, laborCost: 0, totalCost: 0 };

        // Находим связанную фигуру
        const shape = item.shape_id ? measurementShapes.find((s) => s.id === item.shape_id) : null;

        // Определяем категорию
        let category: keyof CategoryTotals = "roof"; // default

        if (item.is_manual) {
            // Для ручных элементов смотрим на тип сборки и тип цены
            if (item.manual_assembly_type === "roofing") {
                category = item.manual_pricing_type?.includes("linear") ? "linear" : "roof";
            } else if (item.manual_assembly_type === "siding") {
                category = item.manual_pricing_type?.includes("linear") ? "linear" : "siding";
            }
        } else if (shape) {
            // Для автоматических элементов смотрим на фигуру
            const surfaceType = shape.surface_type?.toLowerCase() || "";
            const shapeType = shape.shape_type;

            if (shapeType === "line") {
                category = "linear";
            } else if (surfaceType.includes("roof")) {
                category = "roof";
            } else if (surfaceType.includes("siding")) {
                category = "siding";
            }
        }

        // Добавляем стоимость в соответствующую категорию
        totals[category].material += cost.materialCost;
        totals[category].labor += cost.laborCost;
        totals[category].total += cost.totalCost;
    }

    return totals;
}

// ------------------------------------------------------------
// HTML Template for Estimate
// ------------------------------------------------------------
function buildEstimateHtml(
    estimate: EstimateWithDetails,
    totals: { totalMaterialCost: number; totalLaborCost: number; totalCost: number },
    measurementSummary: MeasurementSummary,
    lineItemCosts: { materialCost: number; laborCost: number; totalCost: number }[],
    measurementShapes: MeasurementShape[],
    categoryTotals: CategoryTotals,
) {
    const generatedAt = new Date().toLocaleString();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // --- Destructure data for cleaner template ---
    const {
        id: estimateId,
        is_finalize: isFinalized,
        created_at: createdAt,
        updated_at: updatedAt,
        inspections,
        measurement_sessions,
        estimate_items: items,
    } = estimate;

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    return `
<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset="utf-8" />
<title>Estimate Report</title>
<style>
  /* Basic styling for PDF */
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 14px; }
  .header { padding: 0px 20px 16px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
  .logo img { width: 180px; height: auto; }
  .company-info { text-align: left; font-size: 13px; line-height: 1.4; }
  .section { padding: 20px; }
  h1 { margin-top: 0; font-size: 24px; }
  h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  h3 { font-size: 16px; margin-top: 15px; margin-bottom: 5px; }
  p { margin: 8px 0; }
  .details-table { width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; }
  .details-table th, .details-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  .details-table th { background-color: #f2f2f2; }
  .totals-section { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 15px 0; }
  .summary-card { background: #f8fafc; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
  .summary-value { font-size: 1.1em; font-weight: bold; color: #2d3748; }
  .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
  .photo-grid img { width: calc(50% - 10px); max-width: 250px; border: 1px solid #cbd5e0; border-radius: 4px; }
  .footer { position: fixed; bottom: 10px; width: 100%; text-align: center; font-size: 10px; color: #666; }
  .no-page-break { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div class="logo">
      <img src="${origin}/logo.png" alt="Company Logo"/>
  </div>
  <div class="company-info">
      <strong>Donahue Roofing &amp; Siding LLC</strong><br/>
      1503 13th Street West<br/>
      Billings, Montana 59102<br/>
      Phone: (406) 855-0438<br/>
      Email: mitch@calldonahue.com<br/>
      www.calldonahue.com
  </div>
</div>

<!-- ESTIMATE OVERVIEW SECTION -->
<div class="section">
  <h1>Estimate</h1>
  <p><strong>Date:</strong> ${
      createdAt
          ? new Date(createdAt).toLocaleDateString("en-US", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            })
          : "N/A"
  }</p>
  <p><strong>Status:</strong> ${isFinalized ? "Finalized" : "Draft"}</p>  
  <p><strong>Property:</strong> ${inspections?.properties?.name || measurement_sessions?.properties?.name || "N/A"}</p>
  <p><strong>Address:</strong> ${inspections?.properties?.address || measurement_sessions?.properties?.address || "N/A"}</p>

  <h3>Inspection</h3>
  <p><strong>Inspector:</strong> ${inspections?.users?.name || "N/A"}</p>
  <p><strong>Date:</strong> ${formatDate(inspections?.date)}</p>
  <p><strong>Roof Type:</strong> ${inspections?.roof_type || "N/A"}</p> 
<!-- INSPECTION SUMMARY NOTES (if linked) -->
${
    inspections?.summary_notes
        ? `
<div class="section">
  <h2>Inspection Summary Notes</h2>
  <p>${inspections.summary_notes}</p>
</div>
`
        : ""
}  
  <h3>Measurement</h3>
  <p><strong>Inspector:</strong> ${measurement_sessions?.users?.name || "N/A"}</p>
  <p><strong>Date:</strong>${formatDate(measurement_sessions?.date)}</p>  
</div>

<!-- MEASUREMENT SUMMARY (Stage 4.3 compliant) -->
<div class="section">
  <h2>Measurement Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div>Roof Area</div>
      <div class="summary-value">${measurementSummary.roof.totalAreaSqFt} sq ft</div>
      <div>(${measurementSummary.roof.totalSquares} squares)</div>
    </div>
    
    <div class="summary-card">
      <div>Siding Area</div>
      <div class="summary-value">${measurementSummary.siding.totalAreaSqFt} sq ft</div>
    </div>
    
    <div class="summary-card">
      <div>Ridge</div>
      <div class="summary-value">${measurementSummary.linear.ridge} ft</div>
    </div>
    
    <div class="summary-card">
      <div>Eave</div>
      <div class="summary-value">${measurementSummary.linear.eave} ft</div>
    </div>
    
    <div class="summary-card">
      <div>Trim</div>
      <div class="summary-value">${measurementSummary.linear.trim} ft</div>
    </div>
    
    <div class="summary-card">
      <div>Other Linear</div>
      <div class="summary-value">${measurementSummary.linear.other} ft</div>
    </div>
  </div>
  
  <!-- MEASUREMENT IMAGES (Base images only, max 6) -->
  ${
      measurementSummary.images.length > 0
          ? `
  <div class="no-page-break">
    <h3>Measurement Images</h3>
    <div class="photo-grid">
        ${measurementSummary.images.map((img) => `<img src="${img}" alt="Measurement" />`).join("")}
    </div>
  </div>
  `
          : ""
  }
</div>

<!-- ESTIMATE ITEMS SECTION -->
<div class="section">
  <h2>Estimate Details</h2>
  
  <table class="details-table">
        <thead>
          <tr>
            <th>Shape / Surface</th>
            <th>Assembly</th>
            <th>Type</th>
<!--            <th>Pricing Unit</th>-->
            <th>Material Cost</th>
            <th>Labor Cost</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
     ${
         items
             ?.map((item, idx) => {
                 const cost = lineItemCosts[idx] || {
                     materialCost: 0,
                     laborCost: 0,
                     totalCost: 0,
                 };

                 // Находим связанную фигуру
                 const shape = measurementShapes.find((s) => s.id === item.shape_id);

                 // Определяем описание элемента
                 const name = item.is_manual
                     ? `Manual Item: ${item.manual_descriptions || "N/A"}`
                     : item.assemblies?.assembly_name || "N/A";

                 // Описание фигуры
                 const shapeDescription = shape
                     ? shape.label
                         ? `${shape.label} (${shape.surface_type} - ${shape.magnitude})`
                         : `${shape.surface_type} (${shape.shape_type} - ${shape.magnitude})`
                     : "N/A";

                 const type = item.is_manual
                     ? item.manual_assembly_type
                     : item.assemblies?.assembly_type || "N/A";
                 const pricingType = item.is_manual
                     ? item.manual_pricing_type
                     : item.assemblies?.pricing_type || "N/A";

                 return `
                      <tr>
                        <td>${shapeDescription}</td>
                        <td>${name}</td>
                        <td>${type}</td>
                        <!-- <td>${pricingType ? pricingType.replace(/_/g, " ") : "N/A"}</td>-->
                        <td>$${cost.materialCost.toFixed(2)}</td>
                        <td>$${cost.laborCost.toFixed(2)}</td>
                        <td>$${cost.totalCost.toFixed(2)}</td>
                      </tr>`;
             })
             .join("") || "<tr><td colspan='7'>No items found.</td></tr>"
     }
    </tbody>
  </table>

    <!-- GRAND TOTALS -->
    <div class="totals-section no-page-break">    
    <h2>Grand Totals</h2>
    <hr>
    <h3>Roof</h3>
    <p><strong>$${categoryTotals.roof.total.toFixed(2)}</strong></p>
    <p><strong>Material:</strong> $${categoryTotals.roof.material.toFixed(2)}</p>
    <p><strong>Labor:</strong> $${categoryTotals.roof.labor.toFixed(2)}</p>
    <hr>       
    <h3>Siding</h3>
    <p><strong>$${categoryTotals.siding.total.toFixed(2)}</strong></p>
    <p><strong>Material:</strong> $${categoryTotals.siding.material.toFixed(2)}</p>
    <p><strong>Labor:</strong> $${categoryTotals.siding.labor.toFixed(2)}</p>
    <hr>
    <h3>Linear</h3>
    <p><strong>$${categoryTotals.linear.total.toFixed(2)}</strong></p>
    <p><strong>Material:</strong> $${categoryTotals.linear.material.toFixed(2)}</p>
    <p><strong>Labor:</strong> $${categoryTotals.linear.labor.toFixed(2)}</p>
    <hr>
    <p><strong>Total Material Cost:</strong> $${totals.totalMaterialCost.toFixed(2)}</p>
    <p><strong>Total Labor Cost:</strong> $${totals.totalLaborCost.toFixed(2)}</p>
    <p style="font-size: 1.4em; font-weight: bold; color: #2d3748; margin-top: 10px;">
      <strong>Grand Total:</strong> $${totals.totalCost.toFixed(2)}
    </p>
    </div>
    
    <!-- FOOTER -->
    <div class="footer">
      Generated on ${generatedAt}
    </div>

</body>
</html>
`;
}
