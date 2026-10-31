export type UserRole = 'buyer' | 'company' | 'admin' | 'super_admin';
export type AdminRole = 'super_admin' | 'moderator';
export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'transferred' | 'refunded' | 'failed' | 'cancelled';
export type ListingType = 'rental' | 'sale' | 'service';
export type ListingStatus = 'active' | 'inactive' | 'reserved' | 'maintenance' | 'draft';

export type QuoteRequestType = 'single_listing' | 'multi_vendor';
export type QuoteRequestStatus = 'draft' | 'sent' | 'quotes_received' | 'accepted' | 'rejected' | 'expired';
export type QuoteStatus = 'submitted' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export type AvailabilityStatus = 'available' | 'booked' | 'maintenance';
export type BookingStatus = 'pending' | 'confirmed' | 'approved' | 'completed' | 'cancelled' | 'rejected' | 'expired';

export type NotificationType =
  | 'new_quote_request'
  | 'new_quote'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'new_message'
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'new_review';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  kvkk_accepted_at: string;
  kvkk_version?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  email_verified_at?: string | null;
  phone_verified_at?: string | null;
  two_factor_enabled?: boolean;
  notification_preferences?: { email: boolean; sms: boolean; push: boolean };
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  tax_number?: string | null;
  tax_office?: string | null;
  legal_type?: 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY' | string;
  tax_plate_url?: string | null;
  signature_circular_url?: string | null;
  tax_document_url?: string | null;
  operating_license_url?: string | null;
  onboarding_step?: string;
  verification_status?: VerificationStatus;
  verification_notes?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  sub_merchant_key?: string | null;
  iban?: string | null;
  accept_online_payments?: boolean;
  phone: string;
  whatsapp?: string | null;
  logo_url?: string | null;
  city_id?: number | null;
  district_id?: number | null;
  address?: string | null;
  is_verified: boolean;
  is_demo: boolean;
  is_sponsored?: boolean;
  ad_campaign_id?: string;
  rating_avg?: number;
  review_count?: number;
  weighted_rating?: number;
  created_at: string;
  updated_at: string;
  city_name?: string;
  district_name?: string;
}

export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  icon?: string | null;
  order_index: number;
  is_active: boolean;
  allowed_listing_types?: ListingType[];
  created_at: string;
  subcategories?: Category[];
}

export type AttributeType = 'text' | 'number' | 'select' | 'boolean';

export interface CategoryAttribute {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  attribute_type: AttributeType;
  unit?: string | null;
  options?: string[] | null;
  is_required: boolean;
  is_filterable: boolean;
  show_in_comparison: boolean;
  order_index: number;
  created_at?: string;
}

export interface City {
  id: number;
  name: string;
  plate_code: number;
  lat: number;
  lng: number;
}

export interface District {
  id: number;
  city_id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface Neighborhood {
  id: number;
  district_id: number;
  city_id: number;
  name: string;
  postal_code: string;
  lat: number;
  lng: number;
  city_name?: string;
  district_name?: string;
}

export interface ListingTechnicalSpecs {
  year?: number;
  brand?: string;
  model?: string;
  tonnage?: string;
  boom_length?: string;
  capacity?: string;
  working_hours?: number;
  condition?: 'sıfır' | 'az_kullanılmış' | 'ikinci_el';
  [key: string]: unknown;
}

export interface Listing {
  id: string;
  company_id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
  listing_type: ListingType;
  
  price_daily?: number | null;
  price_weekly?: number | null;
  price_monthly?: number | null;
  price_sale?: number | null;
  currency: string;
  
  // Prompt 6: Esnek Fiyatlandırma ve Malzeme / Hizmet Birimleri
  pricing_type?: 'fixed' | 'custom_quote' | 'unit_rate';
  price_unit?: string | null;
  min_order_quantity?: number | null;
  delivery_available?: boolean;
  delivery_max_distance_km?: number | null;
  delivery_fee_cents?: number | null;
  
  // Hizmet Alanları (Service Area & Capabilities)
  service_area_type?: 'radius' | 'cities' | 'turkey_wide';
  service_radius_km?: number | null;
  service_city_ids?: number[] | null;
  has_license_document?: boolean;
  license_document_url?: string | null;
  experience_years?: number | null;
  team_size?: number | null;
  portfolio_images?: string[];
  scope_description?: string | null;
  methodology_description?: string | null;
  available_from?: string | null;
  
  is_operator_included: boolean;
  is_fuel_included: boolean;
  is_transport_included: boolean;
  
  status: ListingStatus;
  stock_quantity?: number;
  
  city_id: number;
  district_id: number;
  neighborhood_id?: number | null;
  address_detail?: string | null;
  lat: number;
  lng: number;
  
  technical_specs: ListingTechnicalSpecs;
  images: string[];
  
  is_demo: boolean;
  is_sponsored?: boolean;
  ad_campaign_id?: string;
  rating_avg?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
  
  company?: {
    id?: string;
    name: string;
    phone: string;
    whatsapp?: string | null;
    logo_url?: string | null;
    rating_avg?: number;
    review_count?: number;
    weighted_rating?: number;
  };
  category?: {
    name: string;
    slug: string;
    parent_slug?: string;
  };
  city_name?: string;
  district_name?: string;
  neighborhood_name?: string;
  postal_code?: string;
  distance_km?: number;
}

// ==============================================================================
// PROMPT 3: TEKLİF SİSTEMİ TİPLERİ
// ==============================================================================
export interface QuoteRequest {
  id: string;
  buyer_id: string;
  request_type: QuoteRequestType;
  listing_id?: string | null;
  category_id: string;
  title: string;
  description: string;
  quantity: number;
  start_date: string;
  end_date?: string | null;
  city_id: number;
  district_id?: number | null;
  address_detail?: string | null;
  lat?: number | null;
  lng?: number | null;
  need_operator: boolean;
  need_fuel: boolean;
  need_transport: boolean;
  status: QuoteRequestStatus;
  max_recipients: number;
  search_radius_km: number;
  project_files?: string[];
  estimated_surface_area_m2?: number | null;
  work_duration_estimate?: string | null;
  expires_at: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  
  // Relations
  buyer?: Profile;
  listing?: Listing;
  category?: Category;
  city_name?: string;
  district_name?: string;
  quotes_count?: number;
  quotes?: Quote[];
}

export interface Quote {
  id: string;
  request_id: string;
  company_id: string;
  listing_id?: string | null;
  price_total: number;
  price_unit?: number | null;
  currency: string;
  is_operator_included: boolean;
  is_fuel_included: boolean;
  is_transport_included: boolean;
  notes?: string | null;
  valid_until: string;
  status: QuoteStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  company?: Company;
  listing?: Listing;
  distance_km?: number;
}

// ==============================================================================
// PROMPT 3: MESAJLAŞMA TİPLERİ
// ==============================================================================
export interface Conversation {
  id: string;
  buyer_id: string;
  company_id: string;
  listing_id?: string | null;
  quote_id?: string | null;
  quote_request_id?: string | null;
  is_blocked?: boolean;
  last_message_at?: string;
  created_at: string;
  updated_at: string;

  // Joined
  buyer?: Profile;
  company?: Company;
  listing?: Listing;
  quote_request?: QuoteRequest;
  last_message?: any;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content?: string;
  body?: string; // alias
  attachment_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  
  sender?: Profile;
}

// ==============================================================================
// PROMPT 3: MÜSAİTLİK VE REZERVASYON TİPLERİ
// ==============================================================================
export interface ListingAvailability {
  id: string;
  listing_id: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  booked_quantity: number;
  notes?: string | null;
}

export type AvailabilityCalendar = ListingAvailability;

export interface Booking {
  id: string;
  buyer_id: string;
  company_id: string;
  listing_id: string;
  quote_id?: string | null;
  start_date: string;
  end_date: string;
  quantity?: number;
  total_days?: number;
  daily_price_applied?: number;
  total_price?: number;
  agreed_price?: number;
  currency: string;
  operator_included?: boolean;
  fuel_included?: boolean;
  transport_included?: boolean;
  is_operator_included?: boolean;
  is_fuel_included?: boolean;
  is_transport_included?: boolean;
  site_address?: string | null;
  notes?: string | null;
  status: BookingStatus;
  rejection_reason?: string | null;
  payment_status?: string;
  payment_amount?: number;
  expires_at: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  buyer?: Profile;
  company?: Company;
  listing?: Listing;
  review?: Review;
}

// ==============================================================================
// PROMPT 3: PUANLAMA VE YORUMLAR
// ==============================================================================
export interface Review {
  id: string;
  booking_id?: string | null;
  buyer_id: string;
  company_id: string;
  listing_id?: string | null;
  rating?: number; // 1-5
  rating_overall?: number;
  rating_quality?: number;
  rating_timing?: number;
  rating_communication?: number;
  comment: string;
  is_edited?: boolean;
  edited_at?: string | null;
  company_reply?: string | null;
  company_reply_at?: string | null;
  company_replied_at?: string | null;
  is_verified?: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at?: string;

  buyer?: Profile;
  listing?: Listing;
}

// ==============================================================================
// PROMPT 3: GÜVENLİK VE BİLDİRİM TİPLERİ
// ==============================================================================
export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id?: string | null;
  message_id?: string | null;
  review_id?: string | null;
  listing_id?: string | null;
  reason: string;
  details?: string | null;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  admin_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  content?: string;
  body?: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export type Notification = NotificationItem;

export interface Favorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

export interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  city?: number;
  district?: number;
  neighborhood?: number;
  postal_code?: string;
  radius?: number;
  lat?: number;
  lng?: number;
  min_price?: number;
  max_price?: number;
  listing_type?: ListingType;
  operator_included?: boolean;
  fuel_included?: boolean;
  transport_included?: boolean;
  status?: ListingStatus;
  sort?: 'distance' | 'price_asc' | 'newest' | 'rating';
  view?: 'list' | 'map' | 'split' | 'compare';
  page?: number;
  limit?: number;
  dynamic_filters?: Record<string, any>;
}

export interface SearchResult {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  countsByRadius?: {
    radius50: number;
    radius100: number;
  };
}


// ==============================================================================
// PROMPT 4: YÖNETİM PANELİ, ÖDEMELER, KOMİSYON VE ÜYELİK TİPLERİ
// ==============================================================================

export interface AdminUser {
  id: string;
  role: AdminRole;
  two_factor_enabled: boolean;
  two_factor_secret?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: 'user' | 'company' | 'listing' | 'category' | 'setting' | 'payment' | 'subscription';
  target_id?: string | null;
  ip_address?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
  admin?: Profile;
}

export interface PlatformSetting {
  key: string;
  value: Record<string, any>;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface CommissionRule {
  id: string;
  rule_type: 'global' | 'category' | 'company';
  category_id?: string | null;
  company_id?: string | null;
  rate_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  company?: Company;
}

export interface PaymentTransaction {
  id: string;
  booking_id?: string | null;
  quote_id?: string | null;
  buyer_id: string;
  company_id: string;
  provider: 'iyzico' | 'mock' | string;
  provider_payment_id?: string | null;
  provider_basket_id?: string | null;
  idempotency_key?: string | null;
  amount_cents: number;
  commission_rate_percent: number;
  commission_amount_cents: number;
  vat_amount_cents: number;
  net_company_amount_cents: number;
  currency: string;
  status: PaymentStatus;
  is_transferred_to_submerchant: boolean;
  transferred_at?: string | null;
  refund_amount_cents: number;
  refund_reason?: string | null;
  refunded_at?: string | null;
  card_type?: string | null;
  card_last_four?: string | null;
  raw_provider_response?: Record<string, any> | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;

  buyer?: Profile;
  company?: Company;
  booking?: Booking;
}

export interface MembershipPlan {
  id: 'free' | 'pro' | 'premium' | string;
  name: string;
  price_monthly_cents: number;
  price_yearly_cents: number;
  listing_limit: number;
  photo_limit: number;
  monthly_quote_limit: number;
  commission_discount_percent: number;
  has_premium_badge: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  assigned_by_admin?: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;

  company?: Company;
  plan?: MembershipPlan;
}

// ==============================================================================
// PROMPT 5: REKLAM, ÖNE ÇIKARMA, İSTATİSTİKLER VE PWA TİPLERİ
// ==============================================================================

export type AdProductId =
  | 'showcase_home'
  | 'showcase_category'
  | 'sponsored_listing'
  | 'regional_ad'
  | 'featured_company'
  | string;

export type AdCampaignStatus =
  | 'draft'
  | 'pending_payment'
  | 'pending_moderation'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected';

export type AdPricingModel = 'fixed_duration' | 'cpc';

export interface AdProduct {
  id: AdProductId;
  name: string;
  description: string;
  slot_capacity: number;
  price_7_days_cents: number;
  price_14_days_cents: number;
  price_30_days_cents: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdCampaign {
  id: string;
  company_id: string;
  product_id: AdProductId;
  listing_id?: string | null;
  title: string;
  target_city_id?: number | null;
  target_district_id?: number | null;
  target_category_id?: string | null;
  target_radius_km?: number | null;
  pricing_model: AdPricingModel;
  duration_days: number;
  starts_at?: string | null;
  expires_at?: string | null;
  total_price_cents: number;
  status: AdCampaignStatus;
  moderation_notes?: string | null;
  payment_transaction_id?: string | null;
  impressions_count: number;
  clicks_count: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;

  company?: Company;
  listing?: Listing;
  product?: AdProduct;
}

export type AnalyticsEventType =
  | 'listing_view'
  | 'listing_favorite'
  | 'phone_click'
  | 'whatsapp_click'
  | 'quote_click'
  | 'ad_impression'
  | 'ad_click'
  | 'search_query';

export interface AnalyticsEvent {
  id?: number;
  event_type: AnalyticsEventType;
  target_type: 'listing' | 'company' | 'ad_campaign' | 'search';
  target_id?: string | null;
  campaign_id?: string | null;
  session_hash: string;
  city_id?: number | null;
  category_id?: string | null;
  search_keyword?: string | null;
  search_results_count?: number | null;
  created_at?: string;
}

export interface AnalyticsDailySummary {
  id?: number;
  date: string;
  target_type: 'listing' | 'company' | 'ad_campaign' | 'platform';
  target_id: string;
  views_count: number;
  unique_visitors_count: number;
  favorites_count: number;
  phone_clicks_count: number;
  whatsapp_clicks_count: number;
  quote_requests_count: number;
  bookings_count: number;
  ad_impressions_count: number;
  ad_clicks_count: number;
  created_at?: string;
}

export interface PushSubscriptionItem {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  notify_messages: boolean;
  notify_quotes: boolean;
  notify_bookings: boolean;
  notify_marketing: boolean;
  created_at: string;
}

export interface CompanyPerformanceStats {
  views: number;
  uniqueVisitors: number;
  favorites: number;
  phoneClicks: number;
  whatsappClicks: number;
  quotesReceived: number;
  bookingsMade: number;
  conversionRate: number; // percentage e.g. 4.2%
  adImpressions: number;
  adClicks: number;
  adCtr: number; // Click-through rate e.g. 2.8%
}

export interface PhoneVerification {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at?: string | null;
  resend_after: string;
  created_at: string;
}

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}

