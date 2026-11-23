import { useEffect } from "react";

type PageSeoOptions = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
};

const SITE_NAME = "Story Teller";
const DEFAULT_DESCRIPTION =
  "Transforme ideias em histórias de usuário com IA. Gere features, critérios de aceite e exporte para Jira ou Azure DevOps.";
const DEFAULT_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://storytellerboard.com";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Atualiza title/meta tags da página atual (SPA).
 */
export function usePageSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noIndex = false,
  image = "/logo.png",
}: PageSeoOptions) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const origin = DEFAULT_ORIGIN;
    const pathname = path ?? window.location.pathname;
    const url = `${origin}${pathname}`;
    const imageUrl = image.startsWith("http") ? image : `${origin}${image}`;

    document.title = fullTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "pt_BR");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    upsertLink("canonical", url);
  }, [title, description, path, noIndex, image]);
}
