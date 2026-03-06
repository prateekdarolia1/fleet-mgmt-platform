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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      batteries: {
        Row: {
          battery_id: string
          battery_plan: Database["public"]["Enums"]["battery_plan"] | null
          battery_smart_id: string | null
          created_at: string
          id: string
          location: Database["public"]["Enums"]["battery_location"] | null
          retrofit_date: string | null
          service_provider: Database["public"]["Enums"]["service_provider"]
          status: Database["public"]["Enums"]["battery_status"]
          updated_at: string
          usc_id: string | null
          vehicle_id: string | null
          zone_id: string | null
        }
        Insert: {
          battery_id: string
          battery_plan?: Database["public"]["Enums"]["battery_plan"] | null
          battery_smart_id?: string | null
          created_at?: string
          id?: string
          location?: Database["public"]["Enums"]["battery_location"] | null
          retrofit_date?: string | null
          service_provider: Database["public"]["Enums"]["service_provider"]
          status?: Database["public"]["Enums"]["battery_status"]
          updated_at?: string
          usc_id?: string | null
          vehicle_id?: string | null
          zone_id?: string | null
        }
        Update: {
          battery_id?: string
          battery_plan?: Database["public"]["Enums"]["battery_plan"] | null
          battery_smart_id?: string | null
          created_at?: string
          id?: string
          location?: Database["public"]["Enums"]["battery_location"] | null
          retrofit_date?: string | null
          service_provider?: Database["public"]["Enums"]["service_provider"]
          status?: Database["public"]["Enums"]["battery_status"]
          updated_at?: string
          usc_id?: string | null
          vehicle_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batteries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          ledger_id: string | null
          notes: string | null
          payment_date: string | null
          payment_id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          rental_period: string
          rider_id: string
          rider_name: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_id: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          rental_period: string
          rider_id: string
          rider_name: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          ledger_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          rental_period?: string
          rider_id?: string
          rider_name?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "rider_ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          cities: Json
          created_at: string
          id: string
          pincodes: Json
          state_or_ut: string
          type: string
          updated_at: string
        }
        Insert: {
          cities: Json
          created_at?: string
          id?: string
          pincodes?: Json
          state_or_ut: string
          type: string
          updated_at?: string
        }
        Update: {
          cities?: Json
          created_at?: string
          id?: string
          pincodes?: Json
          state_or_ut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rider_ledgers: {
        Row: {
          created_at: string
          id: string
          rental_amount: number
          rental_frequency: Database["public"]["Enums"]["rental_frequency"]
          rental_start_date: string
          rider_id: string
          rider_name: string
          security_deposit_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          rental_amount: number
          rental_frequency: Database["public"]["Enums"]["rental_frequency"]
          rental_start_date: string
          rider_id: string
          rider_name: string
          security_deposit_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          rental_amount?: number
          rental_frequency?: Database["public"]["Enums"]["rental_frequency"]
          rental_start_date?: string
          rider_id?: string
          rider_name?: string
          security_deposit_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          aadhaar_number: string | null
          aadhar_document: boolean
          account_number: string | null
          address: string
          address_google_link: string | null
          address_line1: string | null
          address_line2: string | null
          aggregator: string | null
          aggregator_credentials_checked: boolean | null
          aggregator_id: string | null
          aggregator_other: string | null
          agreement_document: boolean
          avg_earnings_15_days: number | null
          bank_name: string | null
          battery_smart_id: string | null
          branch_name: string | null
          city: string | null
          created_at: string
          dependent_aadhaar: string | null
          dependent_name: string | null
          dependent_relation: string | null
          dob: string | null
          duty_status: string | null
          email: string
          first_name: string | null
          id: string
          id_credentials_checked: boolean | null
          ifsc_code: string | null
          join_date: string
          joined_since: string | null
          last_name: string | null
          last_payment_date: string | null
          license_document: boolean
          marital_status: string | null
          mobile_number: string | null
          name: string
          onboarded_by: string | null
          pan_number: string | null
          phone: string
          pincode: string | null
          rental_plan: Database["public"]["Enums"]["rental_plan"]
          retained_document_details: string | null
          rider_id: string
          state: string | null
          status: Database["public"]["Enums"]["rider_status"]
          updated_at: string
          vehicle_assigned: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          aadhar_document?: boolean
          account_number?: string | null
          address: string
          address_google_link?: string | null
          address_line1?: string | null
          address_line2?: string | null
          aggregator?: string | null
          aggregator_credentials_checked?: boolean | null
          aggregator_id?: string | null
          aggregator_other?: string | null
          agreement_document?: boolean
          avg_earnings_15_days?: number | null
          bank_name?: string | null
          battery_smart_id?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          dependent_aadhaar?: string | null
          dependent_name?: string | null
          dependent_relation?: string | null
          dob?: string | null
          duty_status?: string | null
          email: string
          first_name?: string | null
          id?: string
          id_credentials_checked?: boolean | null
          ifsc_code?: string | null
          join_date: string
          joined_since?: string | null
          last_name?: string | null
          last_payment_date?: string | null
          license_document?: boolean
          marital_status?: string | null
          mobile_number?: string | null
          name: string
          onboarded_by?: string | null
          pan_number?: string | null
          phone: string
          pincode?: string | null
          rental_plan: Database["public"]["Enums"]["rental_plan"]
          retained_document_details?: string | null
          rider_id: string
          state?: string | null
          status?: Database["public"]["Enums"]["rider_status"]
          updated_at?: string
          vehicle_assigned?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          aadhar_document?: boolean
          account_number?: string | null
          address?: string
          address_google_link?: string | null
          address_line1?: string | null
          address_line2?: string | null
          aggregator?: string | null
          aggregator_credentials_checked?: boolean | null
          aggregator_id?: string | null
          aggregator_other?: string | null
          agreement_document?: boolean
          avg_earnings_15_days?: number | null
          bank_name?: string | null
          battery_smart_id?: string | null
          branch_name?: string | null
          city?: string | null
          created_at?: string
          dependent_aadhaar?: string | null
          dependent_name?: string | null
          dependent_relation?: string | null
          dob?: string | null
          duty_status?: string | null
          email?: string
          first_name?: string | null
          id?: string
          id_credentials_checked?: boolean | null
          ifsc_code?: string | null
          join_date?: string
          joined_since?: string | null
          last_name?: string | null
          last_payment_date?: string | null
          license_document?: boolean
          marital_status?: string | null
          mobile_number?: string | null
          name?: string
          onboarded_by?: string | null
          pan_number?: string | null
          phone?: string
          pincode?: string | null
          rental_plan?: Database["public"]["Enums"]["rental_plan"]
          retained_document_details?: string | null
          rider_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["rider_status"]
          updated_at?: string
          vehicle_assigned?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          battery_type: Database["public"]["Enums"]["battery_type"]
          chassis_number: string
          color: string
          created_at: string
          delivery_date: string
          id: string
          insurance_received: boolean
          location: string | null
          make: string
          model: string
          motor_serial_number: string
          next_maintenance_date: string
          pdi_done_by: string
          portable_charger_received: boolean
          registration_received: boolean
          rental_end_date: string | null
          rental_start_date: string | null
          rider_id: string | null
          rider_name: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vendor: string
        }
        Insert: {
          battery_type: Database["public"]["Enums"]["battery_type"]
          chassis_number: string
          color: string
          created_at?: string
          delivery_date: string
          id?: string
          insurance_received?: boolean
          location?: string | null
          make: string
          model: string
          motor_serial_number: string
          next_maintenance_date: string
          pdi_done_by: string
          portable_charger_received?: boolean
          registration_received?: boolean
          rental_end_date?: string | null
          rental_start_date?: string | null
          rider_id?: string | null
          rider_name?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vendor: string
        }
        Update: {
          battery_type?: Database["public"]["Enums"]["battery_type"]
          chassis_number?: string
          color?: string
          created_at?: string
          delivery_date?: string
          id?: string
          insurance_received?: boolean
          location?: string | null
          make?: string
          model?: string
          motor_serial_number?: string
          next_maintenance_date?: string
          pdi_done_by?: string
          portable_charger_received?: boolean
          registration_received?: boolean
          rental_end_date?: string | null
          rental_start_date?: string | null
          rider_id?: string | null
          rider_name?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vendor?: string
        }
        Relationships: []
      }
      rental_ledgers: {
        Row: {
          id: string
          rider_id: string
          rider_name: string
          vehicle_id: string | null
          vehicle_number: string | null
          rental_start_date: string | null
          rental_amount: number
          security_deposit: number | null
          security_deposit_status: Database["public"]["Enums"]["rental_security_deposit_status"]
          status: Database["public"]["Enums"]["rental_ledger_status"]
          responsible_user_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          rider_id: string
          rider_name: string
          vehicle_id?: string | null
          vehicle_number?: string | null
          rental_start_date?: string | null
          rental_amount?: number
          security_deposit?: number | null
          security_deposit_status?: Database["public"]["Enums"]["rental_security_deposit_status"]
          status?: Database["public"]["Enums"]["rental_ledger_status"]
          responsible_user_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          rider_id?: string
          rider_name?: string
          vehicle_id?: string | null
          vehicle_number?: string | null
          rental_start_date?: string | null
          rental_amount?: number
          security_deposit?: number | null
          security_deposit_status?: Database["public"]["Enums"]["rental_security_deposit_status"]
          status?: Database["public"]["Enums"]["rental_ledger_status"]
          responsible_user_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_ledgers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledgers_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_ledgers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_payments: {
        Row: {
          id: string
          ledger_id: string
          week_number: number
          due_date: string
          amount_due: number
          paid_amount: number | null
          balance: number
          status: Database["public"]["Enums"]["rental_payment_status"]
          payment_date: string | null
          payment_mode: Database["public"]["Enums"]["rental_payment_mode"] | null
          upi_last4: string | null
          received_by: string | null
          external_ref: string | null
          last_reminder_at: string | null
          reminder_count: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ledger_id: string
          week_number: number
          due_date: string
          amount_due: number
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["rental_payment_status"]
          payment_date?: string | null
          payment_mode?: Database["public"]["Enums"]["rental_payment_mode"] | null
          upi_last4?: string | null
          received_by?: string | null
          external_ref?: string | null
          last_reminder_at?: string | null
          reminder_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ledger_id?: string
          week_number?: number
          due_date?: string
          amount_due?: number
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["rental_payment_status"]
          payment_date?: string | null
          payment_mode?: Database["public"]["Enums"]["rental_payment_mode"] | null
          upi_last4?: string | null
          received_by?: string | null
          external_ref?: string | null
          last_reminder_at?: string | null
          reminder_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "rental_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          target_user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          payload: Json
          read: boolean
          read_at: string | null
          action_url: string | null
          action_label: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          target_user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          payload?: Json
          read?: boolean
          read_at?: string | null
          action_url?: string | null
          action_label?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          target_user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          payload?: Json
          read?: boolean
          read_at?: string | null
          action_url?: string | null
          action_label?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_battery_smart_id: {
        Args: { id: string }
        Returns: {
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "user"
      battery_location: "NOIDA" | "OTHER"
      battery_plan: "D2D" | "B2B" | "OTHER"
      battery_status: "ACTIVE" | "MAPPED" | "UNMAPPED"
      battery_type: "Fixed" | "Swappable"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_type: "payment_due" | "payment_overdue" | "payment_received" | "ledger_created" | "ledger_pending_confirmation"
      payment_mode: "cash" | "upi" | "bank-transfer" | "card"
      payment_status: "pending" | "paid" | "overdue" | "partial"
      payment_type: "security_deposit" | "rental"
      rental_frequency: "daily" | "weekly" | "monthly"
      rental_ledger_status: "pending_start" | "active" | "suspended" | "closed" | "cancelled"
      rental_payment_mode: "cash" | "upi" | "bank-transfer" | "card" | "other"
      rental_payment_status: "pending" | "partial" | "paid" | "overdue" | "waived"
      rental_plan: "daily" | "weekly" | "monthly"
      rental_security_deposit_status: "pending" | "collected" | "refunded"
      rider_status: "active" | "inactive" | "suspended" | "deboarded"
      service_provider: "BATTERY_SMART" | "OTHER"
      vehicle_status: "Ready for Deployment" | "Deployed" | "Under Maintenance"
      vehicle_type: "High Speed" | "Low Speed"
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
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "manager", "user"],
      battery_location: ["NOIDA", "OTHER"],
      battery_plan: ["D2D", "B2B", "OTHER"],
      battery_status: ["ACTIVE", "MAPPED", "UNMAPPED"],
      battery_type: ["Fixed", "Swappable"],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_type: ["payment_due", "payment_overdue", "payment_received", "ledger_created", "ledger_pending_confirmation"],
      payment_mode: ["cash", "upi", "bank-transfer", "card"],
      payment_status: ["pending", "paid", "overdue", "partial"],
      payment_type: ["security_deposit", "rental"],
      rental_frequency: ["daily", "weekly", "monthly"],
      rental_ledger_status: ["pending_start", "active", "suspended", "closed", "cancelled"],
      rental_payment_mode: ["cash", "upi", "bank-transfer", "card", "other"],
      rental_payment_status: ["pending", "partial", "paid", "overdue", "waived"],
      rental_plan: ["daily", "weekly", "monthly"],
      rental_security_deposit_status: ["pending", "collected", "refunded"],
      rider_status: ["active", "inactive", "suspended", "deboarded"],
      service_provider: ["BATTERY_SMART", "OTHER"],
      vehicle_status: ["Ready for Deployment", "Deployed", "Under Maintenance"],
      vehicle_type: ["High Speed", "Low Speed"],
    },
  },
} as const
