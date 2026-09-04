# Video providers

The app depends only on the `VideoProvider` interface in `types.ts`. Nothing in
the UI or the learning routes knows where video bytes live.

| Driver    | `VIDEO_DRIVER` | Use for |
|-----------|----------------|---------|
| Storage   | `storage`      | Default. MP4 in our own object storage, streamed via `/api/media` with a signed, user-bound grant. Range requests supported, so seeking works. |
| Bunny     | `bunny`        | Production. HLS transcoding, EU PoPs, token auth. Cheapest egress for a Georgian audience. |
| Mux       | `mux`          | Stub — implement `MuxVideoProvider` and register it in `index.ts`. |

## Adding a provider

1. Implement `VideoProvider` in `src/lib/video/<name>-provider.ts`.
2. Register it in the switch in `index.ts`.
3. Add its credentials to `.env.example` and to the `env` schema in `src/lib/env.ts`.

`getPlaybackSource()` is called **only after** the server has verified
entitlement (`hasCourseAccess`). A provider must never be the thing deciding
whether a student may watch.
