import { siteConfig } from "../site.config";

const urls = process.argv.slice(2).filter((arg) => arg.startsWith("http"));
if (!siteConfig.indexNowKey) {
  console.error("site.config.ts의 indexNowKey가 비어 있습니다.");
  process.exit(1);
}
if (!urls.length) {
  console.log("사용법: npm run indexnow -- https://todaymoneytip.com/글주소/");
  console.log("배포된 사이트의 /<indexNowKey>.txt 가 키와 같아야 핑이 됩니다.");
  process.exit(0);
}

const host = new URL(siteConfig.url).host;
const body = {
  host,
  key: siteConfig.indexNowKey,
  keyLocation: `${siteConfig.url}/${siteConfig.indexNowKey}.txt`,
  urlList: urls,
};

const endpoints = ["https://api.indexnow.org/indexnow", "https://searchadvisor.naver.com/indexnow"];
for (const endpoint of endpoints) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`${endpoint} ${response.status}`);
}
