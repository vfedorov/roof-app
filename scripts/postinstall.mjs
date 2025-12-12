import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

async function main() {
    try {
        console.log("📦 Running postinstall: bundling Chromium for Vercel...");

        const resolved = import.meta.resolve("@sparticuz/chromium");
        const chromiumPath = resolved.replace(/^file:\/\//, "");
        const chromiumDir = dirname(dirname(dirname(chromiumPath)));
        const binDir = join(chromiumDir, "bin");

        if (!existsSync(binDir)) {
            console.log("⚠️ Could not find Chromium bin/, skipping.");
            return;
        }

        const publicDir = join(projectRoot, "public");
        const outputPath = join(publicDir, "chromium-pack.tar.br");

        execSync(`mkdir -p "${publicDir}"`, { stdio: "inherit" });

        console.log("📦 Creating chromium-pack.tar.br ...");

        execSync(`tar -c --use-compress-program=br -f "${outputPath}" -C "${binDir}" .`, {
            stdio: "inherit",
        });

        console.log("✅ Chromium archive created at /public/chromium-pack.tar.br");
    } catch (err) {
        console.log("❌ postinstall failed but it's OK in dev:", err.message);
    }
}

main();
