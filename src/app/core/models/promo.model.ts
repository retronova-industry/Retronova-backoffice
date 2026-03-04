export interface PromoCode {
  id: number;
  code: string;
  tickets_reward: number;
  is_single_use_global: boolean;
  is_single_use_per_user: boolean;
  usage_limit?: number;
  current_uses: number;
  is_active: boolean;
  totalUses?: number;
  usedCount?: number;
}

export interface UsePromoCodeRequest {
  code: string;
}

export interface PromoCodeResponse {
  tickets_received: number;
  new_balance: number;
  message: string;
}

export interface PromoHistory {
  id: number;
  code: string;
  tickets_received: number;
  used_at: string;
}

export interface CreatePromoCodeRequest {
  code: string;
  tickets_reward: number;
  is_single_use_global?: boolean;
  is_single_use_per_user?: boolean;
  usage_limit?: number;
}