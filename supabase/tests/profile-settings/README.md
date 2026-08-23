# Profile / Settings database verification

Run the focused fresh-install and forward-upgrade contract suite from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/profile-settings/run.ps1
```

The suite uses disposable Docker databases only. It verifies RPC signatures, empty `search_path`, `SECURITY DEFINER` account deletion, authenticated-only EXECUTE grants, absence of `PUBLIC`/`anon` execution, owner-scoped trip and Saved Places counts, unauthenticated rejection, cross-user isolation, and account/profile/trip/day/item/Saved Places cascades.
