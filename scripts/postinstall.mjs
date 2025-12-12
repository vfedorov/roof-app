// scripts/postinstall.mjs
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

async function main() {
    try {
        console.log("📦 Running postinstall: bundling chromium-min for Vercel...");

        // Use chromium-min instead of chromium
        const resolved = import.meta.resolve("@sparticuz/chromium-min");
        const chromiumMinPath = resolved.replace(/^file:\/\//, "");

        // chromium-min structure:
        // node_modules/@sparticuz/chromium-min/bin
        const chromiumDir = dirname(dirname(dirname(chromiumMinPath)));
        const binDir = join(chromiumDir, "bin");

        if (!existsSync(binDir)) {
            console.log("⚠️ 'bin/' directory not found inside chromium-min. Skipping.");
            return;
        }

        const publicDir = join(projectRoot, "public");
        const outputPath = join(publicDir, "chromium-pack.tar");

        execSync(`mkdir -p "${publicDir}"`);

        console.log("📦 Creating chromium-pack.tar from chromium-min/bin ...");

        // Create tar
        execSync(`tar -cf "${outputPath}" -C "${binDir}" .`, {
            stdio: "inherit",
        });

        console.log("✅ chromium-pack.tar created successfully in /public/");
    } catch (err) {
        console.log("❌ postinstall failed but allowed in dev:", err.message);
    }
}

main();
