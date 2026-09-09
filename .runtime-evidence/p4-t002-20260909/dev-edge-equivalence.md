# DEV Edge equivalence — VERIFIED (Corrective)

Environment: authorized linked Supabase DEV project `bvblyrzbkyhcreimuumu`, name `TripWise`. Target verified against local `supabase/.temp/project-ref`.

Function: `get-place-metadata`, id `19d7a568-f945-44ed-9615-f412babea0aa`.

Corrective deployment command (executed from repository root):
```powershell
npx --no-install supabase functions deploy get-place-metadata --project-ref bvblyrzbkyhcreimuumu --use-api
```
Exit: **0**, raw output `dev-edge-deploy.txt`, separate `dev-edge-deploy-exit.txt`. Exactly six runtime assets uploaded:
- `index.ts`
- `metadata.ts`
- `types.ts`
- `boundedJson.ts`
- `errors.ts`
- `handler.ts`

After deployment:
- ACTIVE **version 5**, verify_jwt=true; bundle SHA256 `314f23f87fa2eb76de12401480e7fe3e3e12e5902d3bf57850aa25da460e9a7f`.
- Entrypoint deployment identity: `user_fn_bvblyrzbkyhcreimuumu_19d7a568-f945-44ed-9615-f412babea0aa_5`.

Post-deploy download verification (exit 0):
```powershell
npx --no-install supabase functions download get-place-metadata --project-ref bvblyrzbkyhcreimuumu --use-api --workdir .runtime-evidence/p4-t002-20260909/dev-after
```

All **6/6 runtime files are byte-for-byte identical** by SHA256:
- `boundedJson.ts`: `868A2637CFC90D24FEBA243BBB7E30666F24BD1C48A91521BCB7A63B188885BD`
- `errors.ts`: `E24AB3DB72DF2AD04AF950288BC48973224F542C4973A7E0870EAD465594A096`
- `handler.ts`: `E484BDEFB7A1187DDAF1C78D8FB177903B6FF797B44928D791856FA2969E3071`
- `index.ts`: `68403BC0E0F2CE212B4DA46DD91B0EB55835572241ECB303E61E50122EAEA09E`
- `metadata.ts`: `787DD57C631C5AED5AE85D179F19AE33D3E6E47D8B2B36F44E0696C6F4D7AC51`
- `types.ts`: `865831AF3FD26F5672302B73B8C1F36B6915F20C10C431C39F7D06B3E25CFBC8`

Per-file comparison saved in `dev-source-comparison-after.json`.
Functions metadata before/after saved in `dev-functions-before.json` and `dev-functions-after.json`.
Management token stayed in existing process environment; no secret leaks, no bypass of RLS or verify_jwt.
Source equivalence is fully verified.
