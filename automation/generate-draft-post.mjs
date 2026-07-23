import fs from "node:fs/promises";
import path from "node:path";

const required = ["OPENAI_API_KEY", "TOPIC_ID", "TITLE", "SLUG"];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required ${key}.`);
}

const input = {
  topicId: process.env.TOPIC_ID.trim(),
  title: process.env.TITLE.trim(),
  slug: process.env.SLUG.trim().toLowerCase(),
  cluster: process.env.CLUSTER?.trim() || "General",
  targetKeyword: process.env.TARGET_KEYWORD?.trim() || "",
  localIntent: process.env.LOCAL_INTENT?.trim() || "",
};

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
  throw new Error("SLUG may use lowercase letters, numbers, and single hyphens only.");
}

const services = {
  "Hair & Color": "../services/hair-color.html",
  Treatment: "../services/keratin.html",
  "Brow & Lash": "../services/brow-lash.html",
  Lash: "../services/brow-lash.html",
  Bridal: "../services/bridal.html",
  "Bridal & Events": "../services/bridal.html",
  "Waxing & Threading": "../services/waxing-threading.html",
  Facials: "../services/facials.html",
};

const allowedImages = [
  "balayage-finish.jpg", "beige-ribbons.jpg", "blonde-refresh.jpg", "bridal-updo.jpg",
  "brow-shaping.jpg", "champagne-blonde.jpg", "cool-brunette.jpg", "copper-waves.jpg",
  "dimensional-curls.jpg", "dimensional-highlight.jpg", "event-glam-waves.jpg", "glossy-bob.jpg",
  "golden-length.jpg", "icy-blonde-bob.jpg", "lash-tint.jpg", "lived-in-highlight.jpg",
  "rich-auburn.jpg", "salon-curls.jpg", "sleek-finish.jpg", "soft-layers.jpg", "textured-short-cut.jpg"
];

const prompt = `You create an accurate, useful local SEO blog draft for Hair Xpressions, a salon in Fairfax, Virginia.

Topic details:
- Working title: ${input.title}
- Cluster: ${input.cluster}
- Target phrase: ${input.targetKeyword || "not supplied"}
- Reader intent: ${input.localIntent || "not supplied"}

Business truth:
- Services: haircuts and color; smoothing/keratin consultations; brow lamination, brow tinting, henna brows, lash extensions, lash perm + tint; bridal hair and makeup, trials, bridal parties, and quoted on-location service; waxing/threading and facials.
- Lash extensions, lash perms, brow lamination, and henna brows are specialty services and should invite direct confirmation when relevant.
- Bridal pricing, travel, timing, party size, and availability are confirmed in consultation.
- Do not claim the salon offers hair extensions. Do not invent prices, results, availability, reviews, awards, medical advice, products, or exact appointment duration.
- Use plain, warm, consultation-first language. Explain decisions and tradeoffs; do not keyword-stuff.
- Write 850–1,250 useful words. Include a short answer first, 4–6 useful H2 sections, one practical list, and one clear booking CTA.
- Use only these image filenames when selecting images: ${allowedImages.join(", ")}.
- The article needs two internal links within bodyHTML: one service link and the Journal index link. Use only relative site links.

Return JSON only, with exactly these keys:
{
  "seoTitle": "60 characters or fewer when practical",
  "metaDescription": "150–160 characters when practical",
  "kicker": "short category label",
  "h1": "reader-friendly title",
  "dek": "one or two sentence intro",
  "readMinutes": "5 minute read",
  "heroImage": "one allowed filename",
  "heroAlt": "accurate image alt text",
  "bodyHtml": "safe semantic HTML only: p, h2, h3, ul, ol, li, a, strong, em, div class=blog-callout",
  "ctaServicePath": "one relevant relative service path such as ../services/bridal.html",
  "ctaText": "action label"
}`;

const apiResponse = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    reasoning: { effort: "low" },
    text: { verbosity: "medium" },
    input: prompt,
  }),
});

const apiJson = await apiResponse.json();
if (!apiResponse.ok) {
  throw new Error(`OpenAI generation failed: ${apiJson.error?.message || apiResponse.statusText}`);
}

const outputText = apiJson.output_text || apiJson.output
  ?.flatMap((item) => item.content || [])
  .filter((item) => item.type === "output_text")
  .map((item) => item.text)
  .join("\n");

let draft;
try {
  draft = JSON.parse(outputText);
} catch {
  throw new Error("The generator did not return valid JSON. No files were changed.");
}

const requiredDraftFields = ["seoTitle", "metaDescription", "kicker", "h1", "dek", "readMinutes", "heroImage", "heroAlt", "bodyHtml", "ctaServicePath", "ctaText"];
for (const key of requiredDraftFields) {
  if (!String(draft[key] || "").trim()) throw new Error(`Generated draft is missing ${key}.`);
}
if (!allowedImages.includes(draft.heroImage)) throw new Error("Generated draft selected an image that is not in the approved gallery.");
if (!Object.values(services).includes(draft.ctaServicePath)) throw new Error("Generated draft used an unsupported service link.");
if (/<\/?(?:script|style|iframe|form|input|button)\b/i.test(draft.bodyHtml)) {
  throw new Error("Generated draft contains unsupported HTML. No files were changed.");
}

const today = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/New_York" }).format(new Date());
const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const jsonString = (value) => JSON.stringify(String(value));
const pageUrl = `https://www.hairxpressionsva.com/blog/${input.slug}.html`;
const imageUrl = `https://www.hairxpressionsva.com/images/gallery/${draft.heroImage}`;

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(draft.seoTitle)} | Hair Xpressions</title>
  <meta name="description" content="${escapeHtml(draft.metaDescription)}" />
  <link rel="canonical" href="${pageUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(draft.seoTitle)}" />
  <meta property="og:description" content="${escapeHtml(draft.metaDescription)}" />
  <meta property="og:image" content="${imageUrl}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../css/main.css" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${jsonString(draft.h1)},
    "description": ${jsonString(draft.metaDescription)},
    "image": ${jsonString(imageUrl)},
    "datePublished": "${isoDate}",
    "dateModified": "${isoDate}",
    "author": { "@type": "Organization", "name": "Hair Xpressions" },
    "publisher": { "@type": "Organization", "name": "Hair Xpressions", "url": "https://www.hairxpressionsva.com/" },
    "mainEntityOfPage": ${jsonString(pageUrl)}
  }
  </script>
</head>
<body>
  <div data-partial="trust-bar"></div>
  <div data-partial="navbar"></div>
  <header class="page-hero blog-hero">
    <div class="container">
      <div class="breadcrumbs"><a href="../index.html">Home</a> &nbsp;/&nbsp; <a href="index.html">Journal</a> &nbsp;/&nbsp; ${escapeHtml(draft.kicker)}</div>
      <span class="blog-kicker">${escapeHtml(draft.kicker)}</span>
      <h1>${escapeHtml(draft.h1)}</h1>
      <p class="blog-dek">${escapeHtml(draft.dek)}</p>
      <div class="blog-meta"><span>By <a href="../about.html">Hair Xpressions</a></span><span>${today}</span><span>${escapeHtml(draft.readMinutes)}</span></div>
    </div>
  </header>
  <main class="section">
    <div class="container">
      <div class="blog-feature-image"><img src="../images/gallery/${escapeHtml(draft.heroImage)}" alt="${escapeHtml(draft.heroAlt)}" /></div>
      <article class="blog-article">
${draft.bodyHtml}
        <section class="banner-cta blog-cta">
          <span class="eyebrow" style="color: rgba(255,255,255,0.85)">${escapeHtml(draft.kicker)}</span>
          <h2>Ready to plan your next appointment?</h2>
          <p>Explore the relevant Hair Xpressions service, then book the conversation that fits your goal.</p>
          <a href="${escapeHtml(draft.ctaServicePath)}" class="btn btn-light btn-lg">${escapeHtml(draft.ctaText)}</a>
        </section>
      </article>
    </div>
  </main>
  <div data-partial="footer"></div>
  <script src="../js/partials.js"></script>
  <script src="../js/main.js"></script>
</body>
</html>
`;

const blogCard = (prefix = "") => `
        <article class="journal-card">
          <a href="${prefix}${input.slug}.html" class="journal-card-image">
            <img src="${prefix ? "images" : "../images"}/gallery/${escapeHtml(draft.heroImage)}" alt="${escapeHtml(draft.heroAlt)}" loading="lazy" />
          </a>
          <div class="journal-card-body">
            <span class="eyebrow">${escapeHtml(draft.kicker)}</span>
            <h${prefix ? "3" : "2"}><a href="${prefix}${input.slug}.html">${escapeHtml(draft.h1)}</a></h${prefix ? "3" : "2"}>
            <p>${escapeHtml(draft.dek)}</p>
            <a href="${prefix}${input.slug}.html" class="text-link">Read the guide <span aria-hidden="true">&rarr;</span></a>
          </div>
        </article>`;

const insertCard = async (file, card) => {
  const source = await fs.readFile(file, "utf8");
  const marker = '<div class="journal-grid">';
  if (!source.includes(marker)) throw new Error(`${file} no longer has a journal grid marker.`);
  if (source.includes(`${input.slug}.html`)) throw new Error(`${file} already links to this slug.`);
  await fs.writeFile(file, source.replace(marker, `${marker}${card}`));
};

const articlePath = path.join("blog", `${input.slug}.html`);
try {
  await fs.access(articlePath);
  throw new Error(`blog/${input.slug}.html already exists.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

await fs.writeFile(articlePath, page);
await insertCard(path.join("blog", "index.html"), blogCard());
await insertCard("index.html", blogCard("blog/"));
console.log(`Created reviewable draft for Content Pipeline row ${input.topicId}: ${articlePath}`);
