/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "models-dev-website",
      home: "cloudflare",
    };
  },
  async run() {
    const { spawnSync } = await import("child_process");

    const result = spawnSync("bun", ["run", "build"], {
      cwd: ".",
      stdio: "inherit",
    });

    if (result.status !== 0) {
      throw new Error("Build failed");
    }

    const worker = new sst.cloudflare.Worker("Website", {
      url: true,
      handler: "./src/worker.ts",
      assets: {
        directory: "./dist",
      },
      transform: {
        worker: {
          observability: { enabled: true },
        },
      },
    });

    return {
      url: worker.url,
    };
  },
});
