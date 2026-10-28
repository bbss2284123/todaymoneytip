import { seoulDateTime } from "./dates";

export interface PublishStamp {
  id: string;
  at: string;
}

export function publishKey(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value;
}

export function dueBetween(posts: PublishStamp[], now: Date, since: Date): PublishStamp[] {
  const nowKey = seoulDateTime(now);
  const sinceKey = seoulDateTime(since);
  return posts.filter((post) => {
    const key = publishKey(post.at);
    return key > sinceKey && key <= nowKey;
  });
}
