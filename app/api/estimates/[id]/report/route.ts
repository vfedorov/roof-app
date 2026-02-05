import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import puppeteerCore from "puppeteer-core";
import * as os from "node:os";
import { getUser } from "@/lib/auth/auth";

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
    surface_type: string; // e.g., "roof area", "siding area", "ridge", "eave", etc.
    shape_type: "polygon" | "line";
    waste_percentage?: number | null;
    magnitude?: string | null;
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
    assembly_name?: string; // Fetched from assemblies table join
    assembly_type?: "roofing" | "siding"; // Fetched from assemblies table join
    pricing_type?: "per_square" | "per_sq_ft" | "per_linear_ft"; // Fetched from assemblies table join
    material_price?: number; // Fetched from assemblies table join
    labor_price?: number; // Fetched from assemblies table join
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

function computeMeasurementSummary(shapes: MeasurementShape[]): MeasurementSummary {
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

    const images: string[] = [];

    for (const shape of shapes) {
        if (DAMAGE_TYPES.has(shape.surface_type)) continue;

        if (shape.shape_type === "polygon") {
            const area = 55; //shape.areaSqFt ?? 0;
            // if (ROOF_AREA_TYPES.has(shape.surface_type)) {
            roofArea = 54;
            // } else if (SIDING_AREA_TYPES.has(shape.surface_type)) {
            sidingArea = 53;
            // } else {
            otherArea = 52;
            // }
        } else if (shape.shape_type === "line") {
            const length = 44; //shape.lengthFt ?? 0;
            if (LINEAR_TYPES.has(shape.surface_type)) {
                linearTotals[shape.surface_type as keyof typeof linearTotals] = 5;
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
    // Fetch the estimate along with related data (inspections, measurement sessions, estimate items, etc.)
    // This query needs to be adjusted based on your exact table structure and relationships
    const { data: estimate, error: estimateError } = await supabaseServer
        .from("estimates")
        .select(
            `
            *,
            inspections!inspection_id(date, summary_notes, roof_type, properties(name, address), users(name)),
            measurement_sessions!measurement_session_id(date, properties(name, address), users(name),
                measurement_shapes!measurement_session_id(*)),
            estimate_items!estimate_id(*, assemblies!assembly_id(assembly_name, assembly_type, pricing_type, material_price, labor_price))
        `,
        )
        .eq("id", id)
        .single();
    if (estimate) {
        console.log("We've got Estimate");
    }
    if (estimateError || !estimate) {
        console.error("Error fetching estimate:", estimateError);
        return NextResponse.json(
            { error: "Estimate not found or error occurred" },
            { status: 404 },
        );
    }

    // --- 2. PREPARE DATA FOR PDF ---
    // Calculate totals, format data, etc.
    const { totalMaterialCost, totalLaborCost, totalCost } = calculateTotals(
        estimate.estimate_items || [],
    );
    // You can add more calculations or data transformations here
    const shapes = estimate.measurement_sessions?.measurement_shapes || [];
    const measurementSummary = computeMeasurementSummary(shapes);
    // --- 3. UPDATE STATUS IF NEEDED ---
    // Example logic to update status upon PDF generation
    // Adjust the status name and logic according to your requirements
    try {
        const { data: statusData, error: statusError } = await supabaseServer
            .from("status_types")
            .select("id")
            .eq("status_name", "Report Generated") // Or another appropriate status for estimates
            .single();

        if (statusError || !statusData) {
            console.error("Status 'Report Generated' not found:", statusError);
            // Decide whether to continue or fail if status is not found
        } else {
            const user = await getUser();
            // Update estimate status if applicable
            // await supabaseServer.from("estimates").update({...}).eq("id", id);

            // Or update associated inspection status if that's the pattern
            if (estimate.inspections?.id) {
                // Assuming inspection_id links to an inspection_status table
                // Example: Update inspection status
                // await supabaseServer.from("inspection_status").update({...}).eq("inspection_id", estimate.inspections.id);
            }
        }
    } catch (error) {
        console.error("Failed to update status:", error);
        // Log error but don't necessarily stop PDF generation unless critical
    }

    // --- 4. BUILD HTML ---
    const html = buildEstimateHtml(
        estimate,
        { totalMaterialCost, totalLaborCost, totalCost },
        measurementSummary,
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

    await browser.close(); // Always close the browser

    const arrayBuffer = new Uint8Array(pdf).buffer;

    return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename=estimate-${id}.pdf`, // Or attachment
        },
    });
}

// --- CALCULATION HELPERS ---
function calculateTotals(items: EstimateItem[]): {
    totalMaterialCost: number;
    totalLaborCost: number;
    totalCost: number;
} {
    let totalMaterialCost = 0;
    let totalLaborCost = 0;

    items.forEach((item) => {
        const materialPrice = item.is_manual ? item.manual_material_price : item.material_price;
        const laborPrice = item.is_manual ? item.manual_labor_price : item.labor_price;

        if (typeof materialPrice === "number") {
            totalMaterialCost += materialPrice;
        }
        if (typeof laborPrice === "number") {
            totalLaborCost += laborPrice;
        }
    });

    const totalCost = totalMaterialCost + totalLaborCost;
    return { totalMaterialCost, totalLaborCost, totalCost };
}

// ------------------------------------------------------------
// HTML Template for Estimate
// ------------------------------------------------------------
function buildEstimateHtml(
    estimate: EstimateWithDetails,
    totals: { totalMaterialCost: number; totalLaborCost: number; totalCost: number },
    measurementSummary: MeasurementSummary,
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
  <h3>Measurement Images</h3>
  <div class="photo-grid">
    ${measurementSummary.images.map((img) => `<img src="${img}" alt="Measurement" />`).join("")}
  </div>
  `
          : ""
  }
</div>

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

<!-- ESTIMATE ITEMS SECTION -->
<div class="section">
  <h2>Estimate Details</h2>
  
  <table class="details-table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th>Pricing Unit</th>
        <th>Material Cost</th>
        <th>Labor Cost</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${
          items
              ?.map((item) => {
                  const name = item.is_manual
                      ? `Manual Item: ${item.manual_descriptions || "N/A"}`
                      : item.assembly_name || "N/A";

                  const type = item.is_manual ? item.manual_assembly_type : item.assembly_type;
                  const pricingType = item.is_manual ? item.manual_pricing_type : item.pricing_type;
                  const materialPrice = item.is_manual
                      ? item.manual_material_price
                      : item.material_price;
                  const laborPrice = item.is_manual ? item.manual_labor_price : item.labor_price;
                  const total = (materialPrice || 0) + (laborPrice || 0);

                  return `
          <tr>
            <td>${name}</td>
            <td>${type || "N/A"}</td>
            <td>${pricingType ? pricingType.replace(/_/g, " ") : "N/A"}</td>
            <td>$${materialPrice?.toFixed(2) || "0.00"}</td>
            <td>$${laborPrice?.toFixed(2) || "0.00"}</td>
            <td>$${total.toFixed(2)}</td>
          </tr>`;
              })
              .join("") || "<tr><td colspan='6'>No items found.</td></tr>"
      }
    </tbody>
  </table>

  <!-- TOTALS SECTION -->
  <div class="totals-section">
    <h3>Totals</h3>
    <p><strong>Total Material Cost:</strong> $${totals.totalMaterialCost.toFixed(2)}</p>
    <p><strong>Total Labor Cost:</strong> $${totals.totalLaborCost.toFixed(2)}</p>
    <p style="font-size: 1.2em; font-weight: bold;"><strong>Grand Total:</strong> $${totals.totalCost.toFixed(2)}</p>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  Generated on ${generatedAt}
</div>

</body>
</html>
`;
}
