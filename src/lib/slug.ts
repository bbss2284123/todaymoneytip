export function headingSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~]/g, "")
    .replace(/\s+/g, "-");
}
