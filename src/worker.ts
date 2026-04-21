interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function isAssetPath(pathname: string) {
  return pathname.includes(".");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname === "/" ||
      url.pathname === "/index" ||
      url.pathname === "/index.html"
    ) {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    const assetResponse = await env.ASSETS.fetch(new Request(url.toString(), request));
    if (assetResponse.status !== 404 || isAssetPath(url.pathname)) {
      return assetResponse;
    }

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url.toString(), request));
  },
};
