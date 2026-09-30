/**
 * Download all Stitch screens (HTML + screenshot) into stitch-screens/
 * then print a JSON manifest of { title, slug, htmlFile, screenshotFile }
 */
import { StitchToolClient } from "@google/stitch-sdk";
import fs   from "node:fs/promises";
import path from "node:path";

const API_KEY    = "AQ.Ab8RN6KdLwX7b5gCdNvrT-EPHqtK8FwnK1TEfPjx68E97RZxOQ";
const PROJECT_ID = "11265528875641588474";
const OUT_DIR    = "stitch-screens";

// Simple slug builder
function slugify(title) {
  return title
    .replace(/[\u0600-\u06FF\s]+/g, (m) => {
      const map = { "نظام": "nizam", "إدارة": "idara", "اختبارات": "ikhtibarat",
        "الجودة": "jawda", "تسجيل": "tsjyl", "الدخول": "dkhwl", "مع": "maa",
        "الشعار": "shaar", "لوحة": "lawha", "التحكم": "tahakum",
        "جميع": "jamee", "حالات": "halat", "الاختبار": "ikhtibarat",
        "إضافة": "idafa", "حالة": "hala", "مشاريع": "masharee",
        "Dashboard": "dashboard" };
      for (const [ar, en] of Object.entries(map)) if (m.includes(ar)) return en + "-";
      return "screen-";
    })
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "screen";
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = await res.arrayBuffer();
  await fs.writeFile(dest, Buffer.from(buf));
}

const client = new StitchToolClient({ apiKey: API_KEY });

try {
  const { screens } = await client.callTool("list_screens", { projectId: PROJECT_ID });

  // Only screens that have HTML code
  const valid = screens.filter(s => s.htmlCode?.downloadUrl && s.title && s.title !== "image.png");
  console.error(`Found ${valid.length} screens with HTML`);

  const manifest = [];
  const seenSlugs = new Set();

  for (const screen of valid) {
    let slug = slugify(screen.title);
    // Ensure unique slug
    let base = slug, i = 2;
    while (seenSlugs.has(slug)) slug = `${base}-${i++}`;
    seenSlugs.add(slug);

    const dir = path.join(OUT_DIR, slug);
    const assetsDir = path.join(dir, "assets");
    await fs.mkdir(assetsDir, { recursive: true });

    const htmlPath = path.join(dir, "code.html");
    const imgPath  = path.join(dir, "screen.png");

    await download(screen.htmlCode.downloadUrl, htmlPath);
    await download(screen.screenshot.downloadUrl, imgPath);

    manifest.push({ title: screen.title, slug, htmlFile: htmlPath, screenshotFile: imgPath });
    console.error(`✓ ${slug}`);
  }

  // Print manifest as JSON to stdout
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await client.close();
}
