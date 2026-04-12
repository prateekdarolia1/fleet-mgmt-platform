import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Bell,
  AlertTriangle,
  Clock,
  IndianRupee,
  User,
  Truck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Check,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUnreadNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type NotificationWithPayload
} from '@/hooks/useNotifications';
import { RentalLedgerDetail } from './RentalLedgerDetail';
import { toast } from 'sonner';

interface NotificationsPanelProps {
  showAll?: boolean;
  limit?: number;
}

// Get icon for notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'payment_overdue':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'payment_reminder':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'rental_started':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'rental_closed':
      return <XCircle className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
};

// Get priority badge
const getPriorityBadge = (priority: string | null) => {
  if (!priority) return null;

  const styles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    normal: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <Badge variant="outline" className={cn('text-xs', styles[priority] || styles.normal)}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export const NotificationsPanel = ({ showAll = false, limit = 10 }: NotificationsPanelProps) => {
  const [selectedNotification, setSelectedNotification] = useState<NotificationWithPayload | null>(null);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [isLedgerDetailOpen, setIsLedgerDetailOpen] = useState(false);

  const { data: notifications, isLoading } = useUnreadNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const displayedNotifications = showAll
    ? notifications?.slice(0, limit)
    : notifications?.slice(0, 5);

  const handleViewLedger = (notification: NotificationWithPayload) => {
    if (notification.payload?.ledger_id) {
      setSelectedLedgerId(notification.payload.ledger_id as string);
      setIsLedgerDetailOpen(true);
      // Mark as read when viewing
      if (!notification.read) {
        markRead.mutate(notification.id);
      }
    }
  };

  const handleMarkPaid = (notification: NotificationWithPayload) => {
    // Navigate to ledger detail where payment can be recorded
    handleViewLedger(notification);
    toast.info('Use the ledger detail view to record payment');
  };

  const handleDismiss = (notification: NotificationWithPayload) => {
    markRead.mutate(notification.id);
  };

  const handleDelete = (notification: NotificationWithPayload) => {
    deleteNotification.mutate(notification.id);
    setSelectedNotification(null);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading notifications...</div>
        </CardContent>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>No new notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {notifications.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {notifications.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {notifications.length} unread notification{notifications.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            {notifications.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {displayedNotifications?.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-4 hover:bg-slate-50 cursor-pointer transition-colors',
                  notification.read && 'opacity-60'
                )}
                onClick={() => setSelectedNotification(notification)}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">
                          {notification.title || 'Notification'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      {getPriorityBadge(notification.priority)}
                    </div>

                    {/* Payload summary */}
                    {notification.payload && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {notification.payload.rider_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {notification.payload.rider_name}
                          </span>
                        )}
                        {notification.payload.vehicle_number && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {notification.payload.vehicle_number}
                          </span>
                        )}
                        {notification.payload.balance && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {(notification.payload.balance as number).toLocaleString()}
                          </span>
                        )}
                        {notification.payload.days_overdue && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Clock className="h-3 w-3" />
                            {notification.payload.days_overdue as number} days overdue
                          </span>
                        )}
                      </div>
                    )}

                    {/* Time */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {notification.created_at &&
                        formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show more link */}
          {!showAll && notifications.length > 5 && (
            <div className="p-3 text-center border-t">
              <Button variant="link" size="sm">
                View all {notifications.length} notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              {selectedNotification?.title || 'Notification'}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.message}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification?.payload && (
            <div className="space-y-3 py-4">
              {/* Rider Info */}
              {selectedNotification.payload.rider_name && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Rider</span>
                  <span className="font-medium">{selectedNotification.payload.rider_name as string}</span>
                </div>
              )}

              {/* Vehicle Info */}
              {selectedNotification.payload.vehicle_number && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Vehicle</span>
                  <span className="font-medium">{selectedNotification.payload.vehicle_number as string}</span>
                </div>
              )}

              {/* Week */}
              {selectedNotification.payload.week_number && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Week</span>
                  <span className="font-medium">Week {selectedNotification.payload.week_number as number}</span>
                </div>
              )}

              {/* Amount */}
              {selectedNotification.payload.balance && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Amount Due</span>
                  <span className="font-bold text-red-600">
                    ₹{(selectedNotification.payload.balance as number).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Due Date */}
              {selectedNotification.payload.due_date && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="font-medium">
                    {formatDate(selectedNotification.payload.due_date as string)}
                  </span>
                </div>
              )}

              {/* Days Overdue */}
              {selectedNotification.payload.days_overdue && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Overdue By</span>
                  <span className="font-bold text-red-600">
                    {selectedNotification.payload.days_overdue as number} days
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedNotification && handleDismiss(selectedNotification)}
            >
              <Check className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            {selectedNotification?.payload?.ledger_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNotification && handleViewLedger(selectedNotification)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Ledger
              </Button>
            )}
            {selectedNotification?.type === 'payment_overdue' && selectedNotification?.payload?.ledger_id && (
              <Button
                size="sm"
                onClick={() => selectedNotification && handleMarkPaid(selectedNotification)}
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ledger Detail Modal */}
      <Dialog open={isLedgerDetailOpen} onOpenChange={setIsLedgerDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rental Ledger</DialogTitle>
          </DialogHeader>
          {selectedLedgerId && (
            <RentalLedgerDetail
              ledgerId={selectedLedgerId}
              onBack={() => setIsLedgerDetailOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
