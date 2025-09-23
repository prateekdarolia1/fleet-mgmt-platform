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
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"] | null
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
          notes?: string | null
          payment_date?: string | null
          payment_id: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
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
          notes?: string | null
          payment_date?: string | null
          payment_id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"] | null
          rental_period?: string
          rider_id?: string
          rider_name?: string
          status?: Database["public"]["Enums"]["payment_status"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "user"
      battery_type: "Fixed" | "Swappable"
      payment_mode: "cash" | "upi" | "bank-transfer" | "card"
      payment_status: "pending" | "paid" | "overdue" | "partial"
      rental_plan: "daily" | "weekly" | "monthly"
      rider_status: "active" | "inactive" | "suspended" | "deboarded"
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
      battery_type: ["Fixed", "Swappable"],
      payment_mode: ["cash", "upi", "bank-transfer", "card"],
      payment_status: ["pending", "paid", "overdue", "partial"],
      rental_plan: ["daily", "weekly", "monthly"],
      rider_status: ["active", "inactive", "suspended", "deboarded"],
      vehicle_status: ["Ready for Deployment", "Deployed", "Under Maintenance"],
      vehicle_type: ["High Speed", "Low Speed"],
    },
  },
} as const
