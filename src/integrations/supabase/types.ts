export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      price_history: {
        Row: {
          amazon_in_stock: boolean | null
          asin: string
          buy_box_price: number | null
          id: string
          lowest_fba_price: number | null
          lowest_fbm_price: number | null
          rating: number | null
          review_count: number | null
          sales_rank: number | null
          timestamp: string
        }
        Insert: {
          amazon_in_stock?: boolean | null
          asin: string
          buy_box_price?: number | null
          id?: string
          lowest_fba_price?: number | null
          lowest_fbm_price?: number | null
          rating?: number | null
          review_count?: number | null
          sales_rank?: number | null
          timestamp?: string
        }
        Update: {
          amazon_in_stock?: boolean | null
          asin?: string
          buy_box_price?: number | null
          id?: string
          lowest_fba_price?: number | null
          lowest_fbm_price?: number | null
          rating?: number | null
          review_count?: number | null
          sales_rank?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_asin_fkey"
            columns: ["asin"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["asin"]
          },
        ]
      }
      product_analytics: {
        Row: {
          amazon_risk_score: number | null
          asin: string
          competition_level: string | null
          estimated_monthly_sales: number | null
          id: string
          ip_risk_score: number | null
          profit_margin: number | null
          roi_percentage: number | null
          time_to_sell_days: number | null
          updated_at: string
        }
        Insert: {
          amazon_risk_score?: number | null
          asin: string
          competition_level?: string | null
          estimated_monthly_sales?: number | null
          id?: string
          ip_risk_score?: number | null
          profit_margin?: number | null
          roi_percentage?: number | null
          time_to_sell_days?: number | null
          updated_at?: string
        }
        Update: {
          amazon_risk_score?: number | null
          asin?: string
          competition_level?: string | null
          estimated_monthly_sales?: number | null
          id?: string
          ip_risk_score?: number | null
          profit_margin?: number | null
          roi_percentage?: number | null
          time_to_sell_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_asin_fkey"
            columns: ["asin"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["asin"]
          },
        ]
      }
      products: {
        Row: {
          asin: string
          brand: string | null
          category: string | null
          created_at: string
          dimensions: string | null
          id: string
          image_url: string | null
          title: string
          upc: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          asin: string
          brand?: string | null
          category?: string | null
          created_at?: string
          dimensions?: string | null
          id?: string
          image_url?: string | null
          title: string
          upc?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          asin?: string
          brand?: string | null
          category?: string | null
          created_at?: string
          dimensions?: string | null
          id?: string
          image_url?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
          weight?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
