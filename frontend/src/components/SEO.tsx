import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export function SEO({
  title,
  description = "Thoughtfully selected essentials for home, style, technology and everyday life.",
  schema,
}: {
  title: string;
  description?: string;
  schema?: any;
}) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title + " · Nest";
    const set = (key: string, content: string, property = false) => {
      let meta = document.querySelector(
        `meta[${property ? "property" : "name"}="${key}"]`,
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(property ? "property" : "name", key);
        document.head.append(meta);
      }
      meta.setAttribute("content", content);
    };
    set("description", description);
    set("og:title", title + " · Nest", true);
    set("og:description", description, true);
    set("og:url", location.origin + pathname, true);
    set("og:type", schema ? "product" : "website", true);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.append(canonical);
    }
    canonical.setAttribute("href", location.origin + pathname);
    const old = document.querySelector("#structured-data");
    old?.remove();
    if (schema) {
      const script = document.createElement("script");
      script.id = "structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.append(script);
    }
    return () => document.querySelector("#structured-data")?.remove();
  }, [title, description, pathname, schema]);
  return null;
}
