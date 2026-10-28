import { checkPosts, loadPosts } from "../src/lib/check";

const posts = loadPosts();
const issues = checkPosts(posts);
const errors = issues.filter((issue) => issue.level === "error");
const infos = issues.filter((issue) => issue.level === "info");

console.log(`글 ${posts.length}편, 오류 ${errors.length}건, 참고 ${infos.length}건`);
for (const issue of errors) console.error(`오류 ${issue.file}: ${issue.message}`);
for (const issue of infos) console.log(`참고 ${issue.file}: ${issue.message}`);

if (errors.length) process.exit(1);
console.log("check 통과");
