
import fetch from "node-fetch";

const url = "https://bvblyrzbkyhcreimuumu.supabase.co/functions/v1/generate-trip";
const key = "sb_publishable_7-J3EoEcSNXovk1EniZ7AA_FGMPmbVI";

const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ymx5cnpia3loY3JlaW11dW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzExNjI0NiwiZXhwIjoyMTAyNjkyMjQ2fQ.NPIAEaNTuk58YZ4BfT_4BQc240zs7RIe5WTKib8L-NM"; // service role just to bypass auth if needed, or I can use the anonymous key, wait, smoke script creates a user!

// Better yet, I can just modify remote-generate-trip-smoke.ts to print the raw generated payload or error from Edge before mapping!

