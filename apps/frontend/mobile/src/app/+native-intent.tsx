export function redirectSystemPath({ path }: { path: string }) {
    if (path.includes("auth0")) return "/";
    return path;
}