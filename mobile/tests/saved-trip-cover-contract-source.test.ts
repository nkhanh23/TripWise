type FsModule = {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
declare function require(moduleName: 'fs'): FsModule;

const { readFileSync } = require('fs');

describe('saved-trip cover identity source contract', () => {
  it('returns at most two ordered provenance-verified IDs from the compact list RPC', () => {
    const source = readFileSync(
      '../supabase/migrations/20260824010000_add_saved_trip_cover_place_ids.sql',
      'utf8',
    );

    expect(source).toContain("'coverGooglePlaceIds', row.cover_google_place_ids");
    expect(source).toContain('item.place_resolved_at is not null');
    expect(source).toContain('order by day.day_number, item.position, item.id');
    expect(source).toContain('limit 2');
    expect(source).not.toContain('get_saved_trip_detail');
  });
});
