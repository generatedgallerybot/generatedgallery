export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          count: number
          icon: string | null
          id: number
          name: string
          slug: string
        }
        Insert: {
          count?: number
          icon?: string | null
          id?: number
          name: string
          slug: string
        }
        Update: {
          count?: number
          icon?: string | null
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          category: string | null
          created_at: string
          crawled_at: string | null
          description: string | null
          downloads: number
          height: number | null
          id: string
          image_url: string
          is_nsfw: boolean
          model: string | null
          negative_prompt: string | null
          prompt: string | null
          source_site: string | null
          source_url: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string | null
          uploaded_by: string | null
          upvotes: number
          views: number
          width: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          crawled_at?: string | null
          description?: string | null
          downloads?: number
          height?: number | null
          id?: string
          image_url: string
          is_nsfw?: boolean
          model?: string | null
          negative_prompt?: string | null
          prompt?: string | null
          source_site?: string | null
          source_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          upvotes?: number
          views?: number
          width?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          crawled_at?: string | null
          description?: string | null
          downloads?: number
          height?: number | null
          id?: string
          image_url?: string
          is_nsfw?: boolean
          model?: string | null
          negative_prompt?: string | null
          prompt?: string | null
          source_site?: string | null
          source_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          uploaded_by?: string | null
          upvotes?: number
          views?: number
          width?: number | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          image_id: string
          voter_ip: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          voter_ip: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          voter_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_image_id_fkey"
            columns: ["image_id"]
            referencedRelation: "images"
            referencedColumns: ["id"]
          }
        ]
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