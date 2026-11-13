/** System sporting links select Search on cold and warm entry; internal Router navigation keeps its current tab. */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    const url = new URL(path, "https://blockout.invalid");
    const pathname =
      url.host && url.protocol !== "http:" && url.protocol !== "https:"
        ? `/${url.host}${url.pathname}`
        : url.pathname;
    if (/^\/(clubs|pools|teams|matches)\/[^/]+\/?$/.test(pathname)) {
      return `/(ordinary)/(tabs)/(discovery)${pathname}${url.search}${url.hash}`;
    }
  } catch {
    return path;
  }
  return path;
}
