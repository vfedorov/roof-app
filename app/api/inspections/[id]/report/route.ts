import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabase-server";
import puppeteerCore from "puppeteer-core";
import * as os from "node:os";
import {
    computeOverallCondition,
    getInspectionSections,
} from "@/lib/inspections/getInspectionSections";
import { mapSectionsForRender } from "@/lib/inspections/mapSectionsForRender";
import { getUser } from "@/lib/auth/auth";

const MAX_PHOTOS_PER_SECTION = 6;

let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

type PdfSection = {
    label: string;
    condition?: string | null;
    observations?: string | null;
    recommendations?: string | null;
    photos: string[];
};

// URL recommended by Sparticuz (works on Vercel)
const CHROMIUM_TAR_URL =
    "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

async function getReportGeneratedStatusId() {
    const { data: status, error } = await supabaseServer
        .from("status_types")
        .select("id")
        .eq("status_name", "Report Generated")
        .single();

    if (error || !status) {
        throw new Error("Status 'Report Generated' not found in status_types table");
    }
    return status.id;
}

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

// ------------------------------------------------------------
// GET — Generate PDF
// ------------------------------------------------------------
export async function GET(request: NextRequest, context: any) {
    const { id } = await context.params;

    // Load inspection
    const { data: inspection } = await supabaseServer
        .from("inspections")
        .select(
            "*, properties(name, address), users(name), inspection_status(locked, status_types(status_name))",
        )
        .eq("id", id)
        .single();

    if (!inspection) {
        return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const rawSections = await getInspectionSections(id);
    const sections = mapSectionsForRender(rawSections);
    const overallCondition = computeOverallCondition(rawSections);

    const sectionsForPdf: PdfSection[] = [];

    try {
        const reportStatusId = await getReportGeneratedStatusId();

        const user = await getUser();

        if (
            inspection?.inspection_status?.status_types?.status_name === "Completed" &&
            inspection?.status_id
        ) {
            await supabaseServer
                .from("inspection_status")
                .update({
                    status_type_id: reportStatusId,
                    locked: true,
                    locked_at: new Date().toISOString(),
                    locked_by: user?.id,
                })
                .eq("id", inspection.status_id);
        }
    } catch (error) {
        console.error("Failed to update inspection status to 'Report Generated':", error);
    }

    for (const section of sections) {
        const { data: images } = await supabaseServer
            .from("inspection_images")
            .select("image_url, annotated_image_url")
            .eq("inspection_id", id)
            .eq("section_id", section.id)
            .order("created_at", { ascending: true });

        const photos: string[] = [];

        if (images) {
            for (const img of images) {
                if (photos.length >= MAX_PHOTOS_PER_SECTION) break;
                if (img.annotated_image_url) {
                    photos.push(img.annotated_image_url);
                }
            }
            for (const img of images) {
                if (photos.length >= MAX_PHOTOS_PER_SECTION) break;
                if (img.image_url) {
                    photos.push(img.image_url);
                }
            }
        }

        if (section.condition || section.observations || section.recommendations || photos.length) {
            sectionsForPdf.push({
                label: section.label,
                condition: section.condition,
                observations: section.observations,
                recommendations: section.recommendations,
                photos,
            });
        }
    }

    // Build HTML
    const html = buildHtml(inspection, sectionsForPdf, overallCondition);

    // Generate PDF
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 1800 });

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
        format: "A4",
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
            "Content-Disposition": `inline; filename=inspection-${id}.pdf`,
        },
    });
}

// ------------------------------------------------------------
// HTML Template
// ------------------------------------------------------------
function buildHtml(inspection: any, sections: PdfSection[], overallCondition: string) {
    const generatedAt = new Date().toLocaleString();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    return `
<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset="utf-8" />
<title>Inspection Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .header { padding: 0px 20px 16px;; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
  .logo img { width: 180px; height: auto; }
  .company-info { text-align: left; font-size: 13px; line-height: 1.4; }
  .section { padding: 20px; }
  h1 { margin-top: 0; font-size: 24px; }
  h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  p { font-size: 14px; }
  .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .photo-grid img { width: calc(50% - 10px); border: 1px solid #ccc; border-radius: 4px; }
  .footer { position: fixed; bottom: 10px; width: 100%; text-align: center; font-size: 10px; color: #666; }
</style>
</head>

<body>

<div class="header">
  <div class="logo">
      <img src="${origin}/logo.png" />
      <div class="company-info">
          <strong>Donahue Roofing &amp; Siding LLC</strong><br/>
          1503 13th Street West<br/>
          Billings, Montana 59102<br/>
          Phone: (406) 855-0438<br/>
          Email: mitch@calldonahue.com<br/>
          www.calldonahue.com
      </div>
  </div>
</div>

<div class="section">
  <h1>Roof Inspection Report</h1>
  <p><strong>Property:</strong> ${inspection.properties?.name ?? ""}</p>
  <p><strong>Address:</strong> ${inspection.properties?.address ?? ""}</p>
  <p><strong>Inspector:</strong> ${inspection.users?.name ?? "Unassigned"}</p>
  <p><strong>Date:</strong> ${inspection.date ?? ""}</p>
  <p><strong>Roof Type:</strong> ${inspection.roof_type ?? ""}</p>
  ${overallCondition ? `<p><strong>Overall Condition:</strong> ${overallCondition} </p>` : ""}
  <p><strong>Status:</strong>${inspection?.inspection_status?.status_types?.status_name ?? ""}</p>
  
</div>

<div class="section">
  <h2>Findings & Notes</h2>
  <p>${inspection.summary_notes || "No notes provided."}</p>
</div>

<div class="section">
  <h2>Inspection Sections</h2>

  ${sections
      .map(
          (section) => `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 16px; margin-bottom: 4px;">
        ${section.label}
      </h3>

      ${section.condition ? `<p><strong>Condition:</strong> ${section.condition}</p>` : ""}
      ${section.observations ? `<p><strong>Observations:</strong> ${section.observations}</p>` : ""}
      ${section.recommendations ? `<p><strong>Recommendations:</strong> ${section.recommendations}</p>` : ""}

      ${
          section.photos.length
              ? `<div class="photo-grid">
                ${section.photos.map((p) => `<img src="${p}" />`).join("")}
               </div>`
              : `<p style="font-size: 12px; color: #666;">${"No photos for this section."}</p>`
      }
    </div>
  `,
      )
      .join("")}
</div>


<div class="footer">
  Generated on ${generatedAt}
</div>

</body>
</html>
`;
}
