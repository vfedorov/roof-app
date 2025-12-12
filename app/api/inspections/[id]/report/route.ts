import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { supabaseServer } from "@/lib/supabase-server";
import * as os from "node:os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ------------------------------------------------------------
// Get correct browser for local + Vercel production
// ------------------------------------------------------------

async function getBrowser() {
    const isLocal = process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT !== "production";
    const platform = os.platform();
    const isWindows = platform === "win32";

    // 1) LOCAL WINDOWS → Use installed Chrome
    if (isLocal && isWindows) {
        const localChromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

        return puppeteerCore.launch({
            headless: true,
            executablePath: localChromePath,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    // 2) LOCAL MAC / LINUX → Try local Chrome if available
    if (isLocal && !isWindows) {
        return puppeteerCore.launch({
            headless: true,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            args: ["--no-sandbox"],
        });
    }

    // 3) VERCEL → chromium-min
    /*
    const chromiumExecutable = await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar",
    );

     */
    const chromiumExecutable = await chromium.executablePath(
        `${process.env.NEXT_PUBLIC_APP_URL}/chromium-pack.tar.br`,
    );

    return puppeteerCore.launch({
        args: chromium.args,
        executablePath: chromiumExecutable,
        headless: true,
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
        .select("*, properties(name, address), users(name)")
        .eq("id", id)
        .single();

    if (!inspection) {
        return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const BUCKET = "inspection-photos";
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;

    const folderAnnotated = `inspections/${id}/annotated`;
    const folderOriginal = `inspections/${id}/original`;

    // Load photos
    const [ann, orig] = await Promise.all([
        supabaseServer.storage.from(BUCKET).list(folderAnnotated),
        supabaseServer.storage.from(BUCKET).list(folderOriginal),
    ]);

    const photos: string[] = [];

    const maxPhotos = 6;

    // Build maps for quick lookup
    const annMap = new Map<string, string>();
    ann.data?.forEach((f) => {
        const baseName = f.name.split(".")[0];
        annMap.set(baseName, `${base}/${folderAnnotated}/${f.name}?v=${Date.now()}`);
    });

    // Go through originals and pair them
    if (orig.data) {
        for (const original of orig.data) {
            if (photos.length >= maxPhotos) break;

            const baseName = original.name.split(".")[0];

            const originalUrl = `${base}/${folderOriginal}/${original.name}?v=${Date.now()}`;
            const annotatedUrl = annMap.get(baseName);

            // add original first
            photos.push(originalUrl);

            // add annotation if exists
            if (annotatedUrl && photos.length < maxPhotos) {
                photos.push(annotatedUrl);
            }
        }
    }

    // Build PDF HTML
    const html = buildHtml(inspection, photos);

    // Generate PDF
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(html, {
        waitUntil: "networkidle0",
    });

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
// Build PDF HTML Template (Clean White Layout)
// ------------------------------------------------------------
function buildHtml(inspection: any, photos: string[]) {
    const generatedAt = new Date().toLocaleString();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return `
<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset="utf-8" />
<title>Inspection Report</title>
<style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }

    /* Header */
    .header {
        padding: 20px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .logo img {
        width: 180px;
        height: auto;
    }

    .company-info {
        text-align: right;
        font-size: 13px;
        line-height: 1.4;
    }

    .section {
        padding: 20px;
    }

    h1 {
        margin-top: 0;
        font-size: 24px;
    }

    h2 {
        font-size: 18px;
        margin-top: 0;
        border-bottom: 1px solid #ddd;
        padding-bottom: 4px;
    }

    p { font-size: 14px; }

    /* Photos: 2 per row */
    .photo-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .photo-grid img {
        width: calc(50% - 10px);
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .footer {
        position: fixed;
        bottom: 10px;
        width: 100%;
        text-align: center;
        font-size: 10px;
        color: #666;
    }
</style>
</head>

<body>

<!-- Header -->
<div class="header">
    <div class="logo">
        <img src="${origin}/logo.png" />
    </div>

    <div class="company-info">
        Donahue Roofing & Siding<br/>
        123 Demo Street<br/>
        Anytown, ST 12345<br/>
        (555) 555-1234<br/>
        www.example.com
    </div>
</div>

<!-- Section: Property & Inspection Summary -->
<div class="section">
    <h1>Roof Inspection Report</h1>

    <p><strong>Property:</strong> ${inspection.properties?.name ?? ""}</p>
    <p><strong>Address:</strong> ${inspection.properties?.address ?? ""}</p>
    <p><strong>Inspector:</strong> ${inspection.users?.name ?? "Unassigned"}</p>
    <p><strong>Date:</strong> ${inspection.date ?? ""}</p>
    <p><strong>Roof Type:</strong> ${inspection.roof_type ?? ""}</p>
</div>

<!-- Section: Notes -->
<div class="section">
    <h2>Findings & Notes</h2>
    <p>${inspection.summary_notes || "No notes provided."}</p>
</div>

<!-- Photos -->
<div class="section">
    <h2>Photos</h2>
    <div class="photo-grid">
        ${photos.map((p) => `<img src="${p}" />`).join("")}
    </div>
</div>

<div class="footer">
    Generated on ${generatedAt}
</div>

</body>
</html>
`;
}
