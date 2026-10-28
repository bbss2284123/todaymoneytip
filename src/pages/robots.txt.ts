import { siteConfig } from "../../site.config";

export function GET() {
  const body = `User-agent: *\nAllow: /\nSitemap: ${siteConfig.url}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
