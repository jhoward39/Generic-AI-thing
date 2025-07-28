import { CONFIG } from "./config";

export async function fetchImageUrl(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY not set - skipping image fetch");
    return null;
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", CONFIG.PEXELS_RESULTS_PER_PAGE.toString());

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
      // 2s timeout guard in edge/serverless context
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const photo = data?.photos?.[0];
    return photo?.src?.medium ?? null;
  } catch (err) {
    console.error("Failed to fetch image from Pexels", err);
    return null;
  }
}
