// Temporary handwritten foundation. Replace with `supabase gen types typescript`
// after a real project is linked and the migration has been applied.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; avatar_url?: string | null; updated_at?: string };
        Relationships: [];
      };
      trips: {
        Row: { id: string; user_id: string; title: string; destination: string; start_date: string; end_date: string; estimated_budget: number | null; currency: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; destination: string; start_date: string; end_date: string; estimated_budget?: number | null; currency?: string | null; created_at?: string; updated_at?: string };
        Update: { title?: string; destination?: string; start_date?: string; end_date?: string; estimated_budget?: number | null; currency?: string | null; updated_at?: string };
        Relationships: [];
      };
      itinerary_days: {
        Row: { id: string; trip_id: string; day_number: number; date: string | null; summary: string | null; created_at: string };
        Insert: { id?: string; trip_id: string; day_number: number; date?: string | null; summary?: string | null; created_at?: string };
        Update: { day_number?: number; date?: string | null; summary?: string | null };
        Relationships: [];
      };
      itinerary_items: {
        Row: { id: string; itinerary_day_id: string; position: number; google_place_id: string | null; place_name: string; latitude: number; longitude: number; place_address: string | null; place_category: string | null; start_time: string | null; end_time: string | null; note: string | null; created_at: string };
        Insert: { id?: string; itinerary_day_id: string; position: number; google_place_id?: string | null; place_name: string; latitude: number; longitude: number; place_address?: string | null; place_category?: string | null; start_time?: string | null; end_time?: string | null; note?: string | null; created_at?: string };
        Update: { position?: number; google_place_id?: string | null; place_name?: string; latitude?: number; longitude?: number; place_address?: string | null; place_category?: string | null; start_time?: string | null; end_time?: string | null; note?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
