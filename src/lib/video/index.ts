import { env } from "@/lib/env";
import type { VideoProvider } from "./types";
import { StorageVideoProvider } from "./storage-provider";
import { BunnyVideoProvider } from "./bunny-provider";

export * from "./types";

let instance: VideoProvider | null = null;

export function videoProvider(): VideoProvider {
  if (instance) return instance;
  switch (env.VIDEO_DRIVER) {
    case "bunny":
      instance = new BunnyVideoProvider();
      break;
    case "mux":
      // Mux follows the same contract; add MuxVideoProvider when credentials
      // are provisioned. Failing loudly beats silently serving nothing.
      throw new Error(
        "VIDEO_DRIVER=mux is not implemented yet. Use 'storage' or 'bunny', or add src/lib/video/mux-provider.ts implementing VideoProvider.",
      );
    default:
      instance = new StorageVideoProvider();
  }
  return instance;
}

export const setVideoProvider = (p: VideoProvider | null) => {
  instance = p;
};
