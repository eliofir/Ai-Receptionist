// Media lives on the site's CDN (Cloudflare R2) — Neon has no object storage. At build
// time you save media under `site-assets/<path>` (a sibling of `src/`, so Vite does not
// bundle it); Vincen provisioning uploads that folder to R2 AND records every file in the
// site's **`assets` table** (columns: name, path, url, size, mime, uploaded_at). That
// table is the media catalog — read it with `useAssets()`.
//
// ── Render an image (table-driven, with an instant fallback) ──
//   import { useAssets } from "@/lib/asset";
//   const { src } = useAssets();
//   <img src={src("world-cup-hero.png")} alt="…" />     // by file name or relative path
//
// ── List ALL media (e.g. a gallery) ──
//   const { assets } = useAssets();
//   assets.map(a => <img key={a.id} src={a.url} alt={a.name} />)
//
// `assetUrl()` is the low-level sync helper (builds `${VITE_ASSET_BASE_URL}/<path>`); it
// returns the SAME URL the table stores, so `useAssets().src()` resolves instantly even
// before the catalog query loads. Prefer storing RELATIVE paths in your own DB rows (e.g.
// "logos/br.png") and resolving with `src()`. BUT `src()`/`assetUrl()` also PASS THROUGH a
// value that is already absolute — a full `http(s)://` URL, a `data:`/`blob:` URI, or
// `<ImageUpload>`'s `/__api/files/<id>` — unchanged. So a `cover_image`/`avatar` column
// that holds a user-uploaded (`/__api/files/…`) or user-entered URL renders correctly through
// `src()` too; you do NOT need to special-case full URLs in components (the old code turned
// them into a broken `/assets/https://…` — that's fixed here, once, for every site).
//
// ❌ NEVER build an image URL by hand — especially NOT `/assets/${path}`
//    (e.g. `<img src={`/assets/${row.image_path}`} />`). Nothing is bundled under
//    `/assets/`; media lives on the CDN, so that path 404s on the LIVE site (it only
//    "works" in a preview that has no CDN, which misleads you). Also never a placeholder
//    like "/assets/placeholder.jpg". ✅ ALWAYS `useAssets().src(path)` (preferred) or
//    `assetUrl(path)` — in EVERY component: cards, detail pages, admin previews, galleries.
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";

const BASE = (import.meta.env.VITE_ASSET_BASE_URL || "/assets").replace(/\/+$/, "");

/** Low-level: build a public CDN URL for a relative asset path (sync, no query).
 *  A value that is ALREADY resolvable is returned UNCHANGED — never re-prefixed with the
 *  CDN base. That covers: an absolute `http(s)://` or protocol-relative `//` URL (a user-
 *  entered or external link), a `data:`/`blob:` URI, and a same-origin path we serve
 *  directly such as `<ImageUpload>`'s `/__api/files/<id>`. Only a BARE RELATIVE path
 *  (`covers/x.svg`, `logos/br.png`) gets the CDN base prefixed. This prevents the classic
 *  broken `/assets/https://…` and `/assets/__api/files/…` (both 404 on the live site). */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path) || path.startsWith("/__api/")) {
    return path;
  }
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}

export type Asset = {
  id: string;
  name: string;
  path: string;
  url: string;
  size: number | null;
  mime: string | null;
};

/**
 * The site's media catalog — the platform-managed `assets` table, filled from R2.
 * Returns the full list plus `src(nameOrPath)` to resolve one URL. `src` falls back to
 * `assetUrl()` (same value) while the query loads or for an unknown ref, so images never
 * block on the fetch.
 */
export function useAssets() {
  const query = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await db.from<Asset[]>("assets").select("id,name,path,url,size,mime");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
  const assets = query.data ?? [];
  const src = (ref: string) => assets.find((a) => a.path === ref || a.name === ref)?.url ?? assetUrl(ref);
  return { assets, src, isLoading: query.isLoading };
}
