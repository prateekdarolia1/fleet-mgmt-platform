import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentSource = "payments" | "rental_payments";
export type CollectedBy = "admin" | "TL1" | "TL2";
export type PaymentMode = "cash" | "upi" | "bank-transfer" | "card" | "other";

export interface MarkPaidWithProofParams {
  /** UUID row id in the source table */
  payment_id: string;
  /** Which table this payment came from (from UnifiedPayment.source) */
  source: PaymentSource;
  /** Full amount of this payment (used for rental_payments paid_amount) */
  amount_due: number;
  /** Payment mode */
  payment_mode: PaymentMode;
  /** Payment date (YYYY-MM-DD) */
  payment_date: string;
  /** Optional notes */
  notes?: string;
  /** Public URL of the uploaded screenshot/PDF. NULL only allowed for admin. */
  screenshot_url: string | null;
  /** Who recorded this payment */
  collected_by: CollectedBy;
}

/**
 * Mark a payment as paid with collection tracking (screenshot, collected_by, collected_at).
 * Handles both payments-source and rental_payments-source rows.
 * For rental_payments rows, keeps the payments table in sync too.
 */
export function useMarkPaymentPaidWithProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkPaidWithProofParams) => {
      const collected_at = new Date().toISOString();

      if (params.source === "payments") {
        const { error } = await supabase
          .from("payments")
          .update({
            status: "paid" as const,
            payment_date: params.payment_date,
            payment_mode: params.payment_mode as any,
            notes: params.notes ?? null,
            screenshot_url: params.screenshot_url,
            collected_by: params.collected_by,
            collected_at,
          } as any)
          .eq("id", params.payment_id);

        if (error) throw error;
        // sync trigger propagates to rental_payments automatically
        return;
      }

      // source === 'rental_payments'
      const { error: rpError } = await supabase
        .from("rental_payments")
        .update({
          status: "paid" as const,
          paid_amount: params.amount_due,
          payment_date: params.payment_date,
          payment_mode: params.payment_mode as any,
          notes: params.notes ?? null,
          screenshot_url: params.screenshot_url,
          collected_by: params.collected_by,
          collected_at,
        } as any)
        .eq("id", params.payment_id);

      if (rpError) throw rpError;

      // Keep payments table in sync (same pattern as useMarkRentalPaymentPaid)
      const { data: rp } = await supabase
        .from("rental_payments")
        .select("*, rental_ledgers(rider_id, rider_name)")
        .eq("id", params.payment_id)
        .single();

      if (rp) {
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("payment_id", rp.payment_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("payments")
            .update({
              status: "paid" as const,
              payment_date: params.payment_date,
              payment_mode: params.payment_mode as any,
              notes: params.notes ?? null,
              screenshot_url: params.screenshot_url,
              collected_by: params.collected_by,
              collected_at,
            } as any)
            .eq("id", existing.id);
        } else {
          const ledger = rp.rental_ledgers as any;
          await supabase.from("payments").insert({
            payment_id: rp.payment_id,
            rider_id: ledger?.rider_id || "",
            rider_name: ledger?.rider_name || "",
            amount: rp.amount_due,
            due_date: rp.due_date,
            payment_date: params.payment_date,
            status: "paid" as const,
            payment_type: "rental" as const,
            rental_period: `Weekly Rental - Week ${rp.week_number}`,
            payment_mode: params.payment_mode as any,
            notes: params.notes ?? null,
            ledger_id: null,
            screenshot_url: params.screenshot_url,
            collected_by: params.collected_by,
            collected_at,
          } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-payments"] });
      queryClient.invalidateQueries({ queryKey: ["unified-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
