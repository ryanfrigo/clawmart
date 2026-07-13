import { permanentRedirect } from "next/navigation";

/**
 * The Studio IS the homepage now. Old /studio deep links land there (308 —
 * search engines should transfer the equity). Build pages at /studio/[id]
 * keep working.
 */
export default function StudioPage() {
  permanentRedirect("/");
}
