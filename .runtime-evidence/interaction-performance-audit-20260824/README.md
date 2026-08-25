# Interaction performance audit evidence

- Device: `emulator-5554`, Android 17, `sdk_gphone16k_x86_64`.
- Runtime: Expo development client (`com.anonymous.tripwisemobile`). The checked-in package is Expo `57.0.15` / React Native `0.86.2`; this differs from the request's RN `0.81.5` snapshot.
- `runtime-snapshots/`: post-interaction UI hierarchy snapshots used only to verify the reached screen/state. They are not timing measurements.
- `home-explore-probe/`: rejected `uiautomator events` experiment. The event collector changed launcher/app state and therefore cannot support latency claims.
- `home-explore-frames/`: rejected SurfaceFlinger experiment. The app produced unrelated frames during the ADB tap bracket, so the first presented frame could not be attributed to the interaction.
- Screenshot capture benchmarking was also rejected for latency measurement because capture itself took hundreds of milliseconds.

Consequently, the audit reports latency milestones as `NOT_MEASURED` unless a reliable app-owned marker existed. Source inspection and stable runtime snapshots are reported separately; no timing is inferred from snapshot completion.
