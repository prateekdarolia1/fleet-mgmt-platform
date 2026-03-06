import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

// Types
export type Notification = Tables<'notifications'>;
export type NotificationType = 'payment_overdue' | 'payment_reminder' | 'rental_started' | 'rental_closed' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationWithPayload extends Notification {
  payload: {
    payment_id?: string;
    ledger_id?: string;
    rider_id?: string;
    rider_name?: string;
    vehicle_number?: string;
    week_number?: number;
    amount_due?: number;
    balance?: number;
    due_date?: string;
    days_overdue?: number;
    [key: string]: unknown;
  } | null;
}

// Fetch unread notifications for current user
export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async (): Promise<NotificationWithPayload[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching unread notifications:', error);
        throw error;
      }

      return (data || []) as NotificationWithPayload[];
    },
  });
}

// Fetch all notifications for current user (with pagination)
export function useNotifications(options?: {
  includeRead?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { includeRead = true, limit = 50, offset = 0 } = options || {};

  return useQuery({
    queryKey: ['notifications', 'all', { includeRead, limit, offset }],
    queryFn: async (): Promise<NotificationWithPayload[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!includeRead) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as NotificationWithPayload[];
    },
  });
}

// Get notification count (unread)
export function useNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('target_user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error counting notifications:', error);
        throw error;
      }

      return count || 0;
    },
  });
}

// Get a single notification by ID
export function useNotificationById(notificationId: string | null) {
  return useQuery({
    queryKey: ['notification', notificationId],
    queryFn: async (): Promise<NotificationWithPayload | null> => {
      if (!notificationId) return null;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching notification:', error);
        throw error;
      }

      return data as NotificationWithPayload;
    },
    enabled: !!notificationId,
  });
}

// Mark a single notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<Notification> => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark notification as read: ${error.message}`);
    },
  });
}

// Mark all notifications as read for current user
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('target_user_id', user.id)
        .eq('read', false)
        .select('id');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      return data?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (count > 0) {
        toast.success(`Marked ${count} notification${count === 1 ? '' : 's'} as read`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark all as read: ${error.message}`);
    },
  });
}

// Delete a notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete notification: ${error.message}`);
    },
  });
}

// Update notification (for admin/dismiss actions)
export function useUpdateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notification_id: string;
      updates: TablesUpdate<'notifications'>;
    }): Promise<Notification> => {
      const { data, error } = await supabase
        .from('notifications')
        .update(params.updates)
        .eq('id', params.notification_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating notification:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update notification: ${error.message}`);
    },
  });
}

// Get notifications by type
export function useNotificationsByType(type: NotificationType) {
  return useQuery({
    queryKey: ['notifications', 'type', type],
    queryFn: async (): Promise<NotificationWithPayload[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications by type:', error);
        throw error;
      }

      return (data || []) as NotificationWithPayload[];
    },
  });
}

// Get notifications summary (by priority)
export function useNotificationsSummary() {
  return useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: async (): Promise<{
      total_unread: number;
      urgent: number;
      high: number;
      normal: number;
      low: number;
    }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total_unread: 0, urgent: 0, high: 0, normal: 0, low: 0 };

      const { data, error } = await supabase
        .from('notifications')
        .select('priority')
        .eq('target_user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error fetching notifications summary:', error);
        throw error;
      }

      const summary = {
        total_unread: data?.length || 0,
        urgent: data?.filter(n => n.priority === 'urgent').length || 0,
        high: data?.filter(n => n.priority === 'high').length || 0,
        normal: data?.filter(n => n.priority === 'normal').length || 0,
        low: data?.filter(n => n.priority === 'low').length || 0,
      };

      return summary;
    },
  });
}
