# Evidence harness correction

The first post-corrective remote attempt progressed through owner apply and then failed an evidence-only assertion that expected unresolved coordinates to be absent. The canonical contract requires `latitude: null` and `longitude: null`, so the assertion was corrected to require null/null while continuing to require no Google provider identifier. That failed attempt cleaned up its disposable trip and both users successfully.

No production implementation was changed for this harness correction. The subsequent run used fresh identities/data and passed the full functional sequence.
