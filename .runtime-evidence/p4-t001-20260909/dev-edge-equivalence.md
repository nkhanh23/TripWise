# DEV Edge equivalence — VERIFIED

Environment: authorized linked Supabase DEV project `bvblyrzbkyhcreimuumu`, name `TripWise`; target verified against local `supabase/.temp/project-ref`. No Git/GitHub inspection.

Function: `explore-places`, id `4479895e-98ce-429a-ac8f-a0cb34bc4c1e`.

Before: ACTIVE version 5, verify_jwt=true, bundle SHA256 `aaf9254f6e7c5e8eab069fb00ea1a9c604f12d02d3184ae10016dfffea3331ac`. Downloaded source lacked boundedJson.ts; handler.ts/googlePlaces.ts differed. Four other runtime files were byte-identical. See `dev-source-comparison-before.json` and `dev-before/`.

Authorized deployment command, from repository root:

```powershell
npx --no-install supabase functions deploy explore-places --project-ref bvblyrzbkyhcreimuumu --use-api
```

Exit: **0**, raw output `dev-edge-deploy.txt`, separate `dev-edge-deploy-exit.txt`. Exactly seven runtime assets uploaded. No other function named, no prune, no no-verify-jwt flag, no secrets/migrations modified.

After: ACTIVE **version 6**, verify_jwt=true; bundle SHA256 `00c0a869f89973d4075919e2e5e9b2d811009325c39614435d7876805bbaa5f0`. Entrypoint deployment identity: `user_fn_bvblyrzbkyhcreimuumu_4479895e-98ce-429a-ac8f-a0cb34bc4c1e_6`.

Post-deploy verification command (exit 0):

```powershell
npx --no-install supabase functions download explore-places --project-ref bvblyrzbkyhcreimuumu --use-api --workdir .runtime-evidence/p4-t001-20260909/dev-after
```

All **7/7 runtime files are byte-for-byte identical** by SHA256: boundedJson.ts, contract.ts, errors.ts, googlePlaces.ts, handler.ts, index.ts, types.ts. Per-file hashes: `dev-source-comparison-after.json`. Download is isolated from production local source.

Safe local runtime aggregate SHA256: `4B5F020102BD746BFDF1C5845CA63DBD49A9E068409D82F82B80088BDFD179D3`. Computed from filename-sorted `filename:uppercase SHA256` lines joined by LF, no trailing LF. This is a source manifest digest, not the platform bundle hash.

Before/after function metadata from `supabase functions list --project-ref bvblyrzbkyhcreimuumu -o json` (both exit 0) is retained. `dev-deployment-scope.json` proves only explore-places changed version/bundle; unrelated functions unchanged.

Management-plane CLI authorization used the existing Supabase access token in process environment; it was not printed. No service-role, secret API key or privileged SQL was used for user-data access. Function secret values were not inspected or modified.

Source equivalence is now verified. This does not by itself establish authenticated live candidate discovery or owner-data no-persistence closure.
