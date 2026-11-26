import fs from "fs";
import path from "path";

interface RevealItem {
  id: string;
  answer: string;
  aliases: string[];
  category: string;
  image: string;
}

interface Manifest {
  count: number;
  items: RevealItem[];
}

// Explicit, unambiguous Wikipedia article titles that have crisp real photographs
const WIKI_TITLES: Record<string, string> = {
  sun: "Sun",
  moon: "Moon",
  rocket: "Falcon_9",
  planet: "Saturn",
  apple: "Apple",
  pizza: "Pizza",
  burger: "Hamburger",
  icecream: "Ice_cream_cone",
  coffee: "Coffee",
  watermelon: "Watermelon",
  donut: "Doughnut",
  banana: "Banana",
  carrot: "Carrot",
  cake: "Birthday_cake",
  bicycle: "Bicycle",
  car: "Sports_car",
  airplane: "Airliner",
  sailboat: "Sailboat",
  train: "High-speed_rail",
  anchor: "Anchor",
  umbrella: "Umbrella",
  camera: "Single-lens_reflex_camera",
  guitar: "Acoustic_guitar",
  headphones: "Headphones",
  musicnote: "Musical_notation",
  clock: "Alarm_clock",
  lightbulb: "Incandescent_light_bulb",
  key: "Key_(lock)",
  crown: "Imperial_State_Crown",
  diamond: "Diamond",
  trophy: "FIFA_World_Cup_Trophy",
  compass: "Compass",
  book: "Hardcover",
  pencil: "Pencil",
  scissors: "Scissors",
  magnet: "Horseshoe_magnet",
  hourglass: "Hourglass",
  gift: "Gift_wrapping",
  balloon: "Toy_balloon",
  tree: "Pine",
  cactus: "Saguaro",
  flower: "Sunflower",
  mountain: "Matterhorn",
  rainbow: "Rainbow",
  lightning: "Lightning",
  snowflake: "Snowflake",
  cloud: "Cumulus_cloud",
  butterfly: "Monarch_butterfly",
  fish: "Clownfish",
  owl: "Barn_owl",
  cat: "Cat",
  panda: "Giant_panda",
  penguin: "Emperor_penguin",
  turtle: "Green_sea_turtle",
  ladybug: "Coccinella_septempunctata",
  basketball: "Basketball_(ball)",
  soccer: "Ball_(association_football)",
  chess: "Pawn_(chess)",
  dice: "Dice",
  pyramid: "Great_Pyramid_of_Giza",
  lighthouse: "Lighthouse",
  house: "House",
  castle: "Neuschwanstein_Castle",
  heart: "Heart_symbol",
  star: "Star",
  glasses: "Glasses",
  backpack: "Backpack",
  microphone: "Microphone",
  telescope: "Refracting_telescope",
  submarine: "Submarine",
  helicopter: "Helicopter",
  hotairballoon: "Hot_air_balloon",
  tent: "Tent",
  campfire: "Campfire",
  volcano: "Volcano",
  microscope: "Optical_microscope",
  robot: "ASIMO",
  satellite: "International_Space_Station",
  violin: "Violin",
  skateboard: "Skateboard",
  surfboard: "Surfboard",
  mushroom: "Amanita_muscaria",
  cupcake: "Cupcake",
  avocado: "Avocado",
  trophycup: "Olympic_medal",
};

// Fallback Wikimedia Commons bitmap search queries if a Wikipedia summary has no raster photo
const COMMONS_FALLBACK_QUERIES: Record<string, string> = {
  heart: "red heart love photo",
  star: "bright star night sky astronomy",
  musicnote: "sheet music",
  key: "brass metal door key closeup",
  magnet: "red horseshoe magnet",
  gift: "wrapped gift box ribbon",
  balloon: "colorful party balloons",
  trophy: "golden trophy cup award",
  trophycup: "gold medal ribbon award",
};

const USER_AGENT =
  "WorldScoreboardArcade/1.0 (https://worldgame-seven.vercel.app; educational game asset fetcher)";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "public",
  "assets",
  "reveal",
  "manifest.json"
);
const PHOTOS_DIR = path.join(process.cwd(), "public", "assets", "reveal", "photos");

function isRasterUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes(".svg") || lower.includes(".ogg") || lower.includes(".ogv") || lower.includes(".pdf")) {
    return false;
  }
  return (
    lower.includes(".jpg") ||
    lower.includes(".jpeg") ||
    lower.includes(".png") ||
    lower.includes(".webp")
  );
}

function normalizeThumbSize(url: string): string {
  // Resize Wikimedia thumbnail URLs to 500px width for fast mobile loading
  return url.replace(/\/\d+px-/, "/500px-");
}

async function fetchWikiThumbnail(title: string): Promise<string | null> {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title
  )}`;
  const res = await fetch(endpoint, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  };
  const thumb = data.thumbnail?.source;
  if (thumb && isRasterUrl(thumb)) {
    return normalizeThumbSize(thumb);
  }
  const orig = data.originalimage?.source;
  if (orig && isRasterUrl(orig)) {
    return orig;
  }
  return null;
}

async function fetchCommonsPhoto(query: string): Promise<string | null> {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    `${query} filetype:bitmap`
  )}&gsrlimit=6&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          imageinfo?: Array<{
            thumburl?: string;
            url?: string;
            mime?: string;
          }>;
        }
      >;
    };
  };
  const pages = Object.values(data.query?.pages ?? {});
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info) continue;
    if (info.mime === "image/jpeg" || info.mime === "image/png" || info.mime === "image/webp") {
      const candidate = info.thumburl || info.url;
      if (candidate && isRasterUrl(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) return false;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (!ct.startsWith("image/") || ct.includes("svg")) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2500) return false;
  fs.writeFileSync(destPath, buf);
  return true;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as Manifest;

  let okCount = 0;
  const failed: string[] = [];

  for (let i = 0; i < manifest.items.length; i++) {
    const item = manifest.items[i];
    const outFile = `${item.id}.jpg`;
    const outPath = path.join(PHOTOS_DIR, outFile);

    // Skip if already downloaded and valid
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2500) {
      item.image = `/assets/reveal/photos/${outFile}`;
      okCount++;
      continue;
    }

    const wikiTitle = WIKI_TITLES[item.id] ?? item.answer.replace(/\s+/g, "_");
    let imgUrl: string | null = null;

    try {
      // For items where Wikipedia article uses an SVG icon (like Heart_symbol), go straight to Commons bitmap search
      if (COMMONS_FALLBACK_QUERIES[item.id] && item.id === "heart") {
        imgUrl = await fetchCommonsPhoto(COMMONS_FALLBACK_QUERIES[item.id]);
      } else {
        imgUrl = await fetchWikiThumbnail(wikiTitle);
      }

      if (!imgUrl) {
        imgUrl = await fetchCommonsPhoto(
          COMMONS_FALLBACK_QUERIES[item.id] ?? `${item.answer} photo`
        );
      }

      if (imgUrl) {
        let saved = await downloadImage(imgUrl, outPath);
        if (!saved) {
          // Try Commons fallback if Wikipedia thumbnail URL failed
          const fallbackUrl = await fetchCommonsPhoto(
            COMMONS_FALLBACK_QUERIES[item.id] ?? `${item.answer} photo`
          );
          if (fallbackUrl) {
            saved = await downloadImage(fallbackUrl, outPath);
          }
        }

        if (saved) {
          item.image = `/assets/reveal/photos/${outFile}`;
          okCount++;
          console.log(`[${i + 1}/${manifest.items.length}] OK ${item.id} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
        } else {
          failed.push(item.id);
          console.warn(`[${i + 1}/${manifest.items.length}] FAIL download ${item.id}`);
        }
      } else {
        failed.push(item.id);
        console.warn(`[${i + 1}/${manifest.items.length}] FAIL lookup ${item.id}`);
      }
    } catch (err) {
      failed.push(item.id);
      console.warn(`[${i + 1}/${manifest.items.length}] ERROR ${item.id}:`, err instanceof Error ? err.message : err);
    }

    // Be polite to Wikimedia APIs
    await sleep(120);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\nDone! ${okCount}/${manifest.items.length} real photos saved.`);
  if (failed.length > 0) {
    console.log(`Failed (${failed.length}): ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

main();
