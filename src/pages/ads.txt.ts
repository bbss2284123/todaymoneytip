import { siteConfig } from "../../site.config";

export function GET() {
  const body = siteConfig.adsense.publisherId
    ? `google.com, ${siteConfig.adsense.publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# publisher id is empty in site.config.ts\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
