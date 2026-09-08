import { useLocation, matchPath } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { pageMeta, notFoundMeta } from "@/config/pageMeta";

const ROUTE_PATTERNS = Object.keys(pageMeta);

/**
 * Sets a relevant <title> and meta description for every route from the
 * central pageMeta map. Mount once near the top of the router (see App.tsx)
 * — it re-runs on every navigation via useLocation. Detail pages with real
 * content (blog posts, careers, services, etc.) call useDocumentTitle()
 * themselves once their data loads, overriding this fallback.
 */
const PageTitle = () => {
  const { pathname } = useLocation();
  const match = ROUTE_PATTERNS.find((pattern) => matchPath({ path: pattern, end: true }, pathname));
  const meta = match ? pageMeta[match] : notFoundMeta;

  useDocumentTitle(meta.title, meta.description);

  return null;
};

export default PageTitle;
