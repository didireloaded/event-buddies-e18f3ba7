export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendee_crew_commands: {
        Row: {
          created_at: string
          fingerprint: string
          operation: string
          request_id: string
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          operation: string
          request_id: string
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          operation?: string
          request_id?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      attendee_crew_invites: {
        Row: {
          crew_id: string
          expires_at: string
          verifier: string
        }
        Insert: {
          crew_id: string
          expires_at: string
          verifier: string
        }
        Update: {
          crew_id?: string
          expires_at?: string
          verifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_crew_invites_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: true
            referencedRelation: "attendee_crews"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_crew_members: {
        Row: {
          crew_id: string
          display_name: string
          event_id: string
          expires_at: string | null
          is_owner: boolean
          joined_at: string
          pin_generation: number
          point_id: string | null
          user_id: string
        }
        Insert: {
          crew_id: string
          display_name: string
          event_id: string
          expires_at?: string | null
          is_owner?: boolean
          joined_at?: string
          pin_generation?: number
          point_id?: string | null
          user_id: string
        }
        Update: {
          crew_id?: string
          display_name?: string
          event_id?: string
          expires_at?: string | null
          is_owner?: boolean
          joined_at?: string
          pin_generation?: number
          point_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_crew_members_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "attendee_crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_crew_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_sync_catalogue"
            referencedColumns: ["event_id"]
          },
        ]
      }
      attendee_crews: {
        Row: {
          created_at: string
          event_id: string
          id: string
          meeting: Json | null
          name: string
          revision: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          meeting?: Json | null
          name: string
          revision?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          meeting?: Json | null
          name?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendee_crews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_sync_catalogue"
            referencedColumns: ["event_id"]
          },
        ]
      }
      attendee_event_preferences: {
        Row: {
          event_id: string
          meeting: Json | null
          revision: number
          saved_artist_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          meeting?: Json | null
          revision?: number
          saved_artist_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          meeting?: Json | null
          revision?: number
          saved_artist_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_event_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_sync_catalogue"
            referencedColumns: ["event_id"]
          },
        ]
      }
      attendee_preference_actions: {
        Row: {
          action_id: string
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_preference_actions_user_id_event_id_fkey"
            columns: ["user_id", "event_id"]
            isOneToOne: false
            referencedRelation: "attendee_event_preferences"
            referencedColumns: ["user_id", "event_id"]
          },
        ]
      }
      event_sync_catalogue: {
        Row: {
          artist_ids: string[]
          ends_at: string
          event_id: string
          point_ids: string[]
          starts_at: string
        }
        Insert: {
          artist_ids: string[]
          ends_at: string
          event_id: string
          point_ids: string[]
          starts_at: string
        }
        Update: {
          artist_ids?: string[]
          ends_at?: string
          event_id?: string
          point_ids?: string[]
          starts_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_attendee_action: {
        Args: { p_action: Json; p_action_id: string; p_event_id: string }
        Returns: {
          event_id: string
          meeting: Json | null
          revision: number
          saved_artist_ids: string[]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attendee_event_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attendee_crew_command: {
        Args: { p_command: Json; p_event_id: string; p_request_id: string }
        Returns: Json
      }
      attendee_crew_state: { Args: { p_event_id: string }; Returns: Json }
      valid_attendee_selection: {
        Args: { p_artists: string[]; p_event_id: string; p_meeting: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
