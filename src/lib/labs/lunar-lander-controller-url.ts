type NetworkControllerUrlOptions = {
  currentOrigin: string;
  networkOrigin?: string;
  preferPortlessLan?: boolean;
};

export function createNetworkControllerLaunchUrl({
  currentOrigin,
  networkOrigin,
  preferPortlessLan = false,
}: NetworkControllerUrlOptions): string {
  const origin =
    networkOrigin?.trim() ||
    (preferPortlessLan ? toPortlessLanOrigin(currentOrigin) : currentOrigin);

  return new URL("/labs/lunar-lander/controller", origin).toString();
}

function toPortlessLanOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.hostname.endsWith(".localhost")) {
    url.hostname = `${url.hostname.slice(0, -".localhost".length)}.local`;
  }
  return url.origin;
}
