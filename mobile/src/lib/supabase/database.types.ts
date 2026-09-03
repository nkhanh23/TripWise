export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      itinerary_days: {
        Row: {
          created_at: string
          date: string | null
          day_number: number
          id: string
          summary: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_number: number
          id?: string
          summary?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          day_number?: number
          id?: string
          summary?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          accommodation_check_in_at: string | null
          accommodation_check_out_at: string | null
          accommodation_details_present: boolean
          accommodation_nights: number | null
          activity_status: string
          completed_at: string | null
          contact_address: string | null
          contact_booking_url: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_website_url: string | null
          created_at: string
          end_time: string | null
          flexibility: string
          google_place_id: string | null
          id: string
          item_kind: string
          itinerary_day_id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          place_address: string | null
          place_category: string | null
          place_name: string
          place_query: string | null
          place_resolved_at: string | null
          position: number
          priority: string
          reservation_code: string | null
          skipped_at: string | null
          start_time: string | null
          transport_arrival_at: string | null
          transport_departure_at: string | null
          transport_destination_label: string | null
          transport_mode: string | null
          transport_operator_name: string | null
          transport_origin_label: string | null
          transport_planned_cost_amount: number | null
          transport_planned_cost_currency: string | null
        }
        Insert: {
          accommodation_check_in_at?: string | null
          accommodation_check_out_at?: string | null
          accommodation_details_present?: boolean
          accommodation_nights?: number | null
          activity_status?: string
          completed_at?: string | null
          contact_address?: string | null
          contact_booking_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_website_url?: string | null
          created_at?: string
          end_time?: string | null
          flexibility?: string
          google_place_id?: string | null
          id?: string
          item_kind?: string
          itinerary_day_id: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          place_address?: string | null
          place_category?: string | null
          place_name: string
          place_query?: string | null
          place_resolved_at?: string | null
          position: number
          priority?: string
          reservation_code?: string | null
          skipped_at?: string | null
          start_time?: string | null
          transport_arrival_at?: string | null
          transport_departure_at?: string | null
          transport_destination_label?: string | null
          transport_mode?: string | null
          transport_operator_name?: string | null
          transport_origin_label?: string | null
          transport_planned_cost_amount?: number | null
          transport_planned_cost_currency?: string | null
        }
        Update: {
          accommodation_check_in_at?: string | null
          accommodation_check_out_at?: string | null
          accommodation_details_present?: boolean
          accommodation_nights?: number | null
          activity_status?: string
          completed_at?: string | null
          contact_address?: string | null
          contact_booking_url?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_website_url?: string | null
          created_at?: string
          end_time?: string | null
          flexibility?: string
          google_place_id?: string | null
          id?: string
          item_kind?: string
          itinerary_day_id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          place_address?: string | null
          place_category?: string | null
          place_name?: string
          place_query?: string | null
          place_resolved_at?: string | null
          position?: number
          priority?: string
          reservation_code?: string | null
          skipped_at?: string | null
          start_time?: string | null
          transport_arrival_at?: string | null
          transport_departure_at?: string | null
          transport_destination_label?: string | null
          transport_mode?: string | null
          transport_operator_name?: string | null
          transport_origin_label?: string | null
          transport_planned_cost_amount?: number | null
          transport_planned_cost_currency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_item_source_links: {
        Row: {
          created_at: string
          id: string
          itinerary_item_id: string
          label: string | null
          link_type: string
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_item_id: string
          label?: string | null
          link_type: string
          position: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_item_id?: string
          label?: string | null
          link_type?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_item_source_links_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "itinerary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          home_country: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_country?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_country?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          created_at: string
          google_place_id: string
          id: string
          latitude: number
          longitude: number
          place_address: string | null
          place_category: string | null
          place_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_place_id: string
          id?: string
          latitude: number
          longitude: number
          place_address?: string | null
          place_category?: string | null
          place_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_place_id?: string
          id?: string
          latitude?: number
          longitude?: number
          place_address?: string | null
          place_category?: string | null
          place_name?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          currency: string | null
          destination: string
          end_date: string
          estimated_budget: number | null
          id: string
          idempotency_key: string | null
          idempotency_request_hash: string | null
          start_date: string
          title: string
          updated_at: string
          user_id: string
          workspace_revision: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          destination: string
          end_date: string
          estimated_budget?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_request_hash?: string | null
          start_date: string
          title: string
          updated_at?: string
          user_id: string
          workspace_revision?: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          destination?: string
          end_date?: string
          estimated_budget?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_request_hash?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_revision?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_verified_place_snapshot: {
        Args: {
          p_google_place_id: string
          p_item_id: string
          p_latitude: number
          p_longitude: number
          p_owner_id: string
          p_place_address?: string
          p_place_category?: string
          p_place_name: string
        }
        Returns: string
      }
      create_trip_graph:
        | { Args: { p_graph: Json }; Returns: string }
        | {
            Args: { p_graph: Json; p_idempotency_key: string }
            Returns: string
          }
      delete_saved_trip: { Args: { p_trip_id: string }; Returns: boolean }
      delete_user_account: { Args: never; Returns: undefined }
      get_saved_trip_detail: { Args: { p_trip_id: string }; Returns: Json }
      get_user_trip_stats: { Args: never; Returns: Json }
      list_saved_places: {
        Args: {
          p_category?: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
        }
        Returns: Json
      }
      list_saved_trips: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_limit?: number
        }
        Returns: Json
      }
      mutate_travel_workspace: { Args: { p_command: Json }; Returns: Json }
      save_place: {
        Args: {
          p_google_place_id: string
          p_latitude: number
          p_longitude: number
          p_place_address?: string
          p_place_category?: string
          p_place_name: string
        }
        Returns: Json
      }
      unsave_place: { Args: { p_google_place_id: string }; Returns: boolean }
      update_itinerary_item_note: {
        Args: { p_item_id: string; p_note: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

