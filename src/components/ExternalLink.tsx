import type { AnchorHTMLAttributes } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** Opens in a new tab (FR-2.5). Build `href` with siteUrl() so it carries UTM tags. */
export function ExternalLink(props: Props) {
  return <a {...props} target="_blank" rel="noopener" />;
}
