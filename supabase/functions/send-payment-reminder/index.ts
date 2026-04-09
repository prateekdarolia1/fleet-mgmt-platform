// Supabase Edge Function: send-payment-reminder
// Description: Sends payment reminders for overdue/pending payments
// Trigger: Called by pg_cron or manually
// Part of: auto-create-rental-ledger change

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface OverduePayment {
  payment_id: string;
  ledger_id: string;
  rider_id: string;
  rider_name: string;
  vehicle_number: string | null;
  week_number: number;
  amount_due: number;
  balance: number;
  due_date: string;
  days_overdue: number;
  responsible_user_id: string | null;
}

Deno.serve(async (req: Request) => {
  try {
    // Verify authorization (can be called by cron or admin)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get overdue payments that need reminders
    const { data: overduePayments, error: fetchError } = await supabase
      .rpc('get_overdue_payments_for_reminder');

    if (fetchError) {
      console.error('Error fetching overdue payments:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch overdue payments', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0, message: 'No overdue payments found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let remindersSent = 0;
    const errors: string[] = [];

    for (const payment of overduePayments as OverduePayment[]) {
      try {
        // Create notification for responsible user
        if (payment.responsible_user_id) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              target_user_id: payment.responsible_user_id,
              type: 'payment_overdue',
              title: `Overdue Payment: ${payment.rider_name}`,
              message: `Payment for Week ${payment.week_number} is ${payment.days_overdue} days overdue. Amount: ₹${payment.balance}`,
              payload: {
                payment_id: payment.payment_id,
                ledger_id: payment.ledger_id,
                rider_id: payment.rider_id,
                rider_name: payment.rider_name,
                vehicle_number: payment.vehicle_number,
                week_number: payment.week_number,
                amount_due: payment.amount_due,
                balance: payment.balance,
                due_date: payment.due_date,
                days_overdue: payment.days_overdue
              },
              action_url: `/rental-ledgers/${payment.ledger_id}`,
              action_label: 'View Ledger',
              priority: payment.days_overdue > 7 ? 'urgent' : payment.days_overdue > 3 ? 'high' : 'normal'
            });

          if (notifError) {
            console.error(`Failed to create notification for payment ${payment.payment_id}:`, notifError);
            errors.push(`Notification failed: ${payment.payment_id}`);
            continue;
          }
        }

        // Update reminder count and timestamp on payment
        const { error: updateError } = await supabase
          .rpc('increment_reminder_count', { p_payment_id: payment.payment_id });

        if (updateError) {
          console.error(`Failed to update reminder count for payment ${payment.payment_id}:`, updateError);
          errors.push(`Update failed: ${payment.payment_id}`);
          continue;
        }

        remindersSent++;
        console.log(`Reminder sent for payment ${payment.payment_id} (${payment.rider_name}, Week ${payment.week_number})`);

      } catch (err) {
        console.error(`Error processing payment ${payment.payment_id}:`, err);
        errors.push(`Processing error: ${payment.payment_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersSent,
        total_overdue: overduePayments.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent ${remindersSent} of ${overduePayments.length} reminders`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
