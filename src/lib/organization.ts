import { absoluteUrl, siteConfig } from "../../site.config";

/** 헤더 로고 마크(검은 둥근 사각형의 오)를 512px로 만든 파일. */
export const organizationLogo = {
  path: "/logo.png",
  width: 512,
  height: 512,
} as const;

export function organizationJsonLd() {
  return {
    "@type": "Organization" as const,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject" as const,
      url: absoluteUrl(organizationLogo.path),
      width: organizationLogo.width,
      height: organizationLogo.height,
    },
  };
}
