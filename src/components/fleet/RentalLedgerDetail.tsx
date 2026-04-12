import { useState } from 'react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dateUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Truck,
  Calendar,
  IndianRupee,
  Clock,
  AlertCircle,
  CheckCircle2,
  Bell,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRentalLedgerById, useRentalLedgerStats } from '@/hooks/useRentalLedgers';
import { useRentalPaymentsByLedger, useMarkRentalPaymentPaid } from '@/hooks/useRentalPayments';
import { RentalPaymentForm } from './RentalPaymentForm';

interface RentalLedgerDetailProps {
  ledgerId: string;
  onBack?: () => void;
}

// Status badge styles
const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending_start: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-amber-100 text-amber-800 border-amber-200',
    suspended: 'bg-orange-100 text-orange-800 border-orange-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const labels: Record<string, string> = {
    pending_start: 'Pending Start',
    active: 'Active',
    paused: 'Paused',
    suspended: 'Suspended',
    closed: 'Closed',
    cancelled: 'Cancelled'
  };

  return (
    <Badge className={cn('border', styles[status] || styles.active)}>
      {labels[status] || status}
    </Badge>
  );
};

// Payment status badge
const getPaymentStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-green-50 text-green-700 border-green-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    waived: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <Badge variant="outline" className={cn('text-xs', styles[status] || styles.pending)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const RentalLedgerDetail = ({ ledgerId, onBack }: RentalLedgerDetailProps) => {
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const { data: ledger, isLoading: ledgerLoading } = useRentalLedgerById(ledgerId);
  const { data: payments, isLoading: paymentsLoading } = useRentalPaymentsByLedger(ledgerId);

  // Calculate stats
  const stats = {
    totalDue: payments?.reduce((sum, p) => sum + (p.amount_due || 0), 0) || 0,
    totalCollected: payments?.reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0,
    outstanding: payments
      ?.filter(p => ['pending', 'partial', 'overdue'].includes(p.status))
      .reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0) || 0,
    overdue: payments
      ?.filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0) || 0,
    overdueCount: payments?.filter(p => p.status === 'overdue').length || 0
  };

  const handleMarkPaid = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsPaymentFormOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentFormOpen(false);
    setSelectedPaymentId(null);
  };

  if (ledgerLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading ledger details...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ledger) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center text-muted-foreground">
            Ledger not found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">{ledger.rider_name}</h2>
            <p className="text-muted-foreground">Rental Ledger Details</p>
          </div>
        </div>
        {getStatusBadge(ledger.status)}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Rider Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Rider</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{ledger.rider_name}</p>
            <p className="text-sm text-muted-foreground">ID: {ledger.rider_id}</p>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Vehicle</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{ledger.vehicle_number || 'Not assigned'}</p>
            {ledger.rental_amount && (
              <p className="text-sm text-muted-foreground">₹{ledger.rental_amount}/week</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {ledger.rental_start_date && (
              <p className="text-sm">
                Started: {formatDate(ledger.rental_start_date)}
              </p>
            )}
            {(ledger as any).rental_end_date && (
              <p className="text-sm text-muted-foreground">
                Ended: {formatDate((ledger as any).rental_end_date)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Due</p>
                <p className="text-xl font-bold">₹{stats.totalDue.toLocaleString()}</p>
              </div>
              <IndianRupee className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-xl font-bold text-green-600">₹{stats.totalCollected.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-amber-600">₹{stats.outstanding.toLocaleString()}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-red-600">₹{stats.overdue.toLocaleString()}</p>
                {stats.overdueCount > 0 && (
                  <p className="text-xs text-red-500">{stats.overdueCount} payment(s)</p>
                )}
              </div>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Info */}
      {ledger.security_deposit && ledger.security_deposit > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Security Deposit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">₹{ledger.security_deposit.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {ledger.security_deposit_status || 'pending'}
                </p>
              </div>
              <Badge variant={ledger.security_deposit_status === 'collected' ? 'default' : 'outline'}>
                {ledger.security_deposit_status === 'collected' ? 'Collected' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>Weekly rental payment entries</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment entries yet. Confirm the rental start to generate payments.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className={cn(
                      payment.status === 'overdue' && 'bg-red-50',
                      payment.status === 'paid' && 'bg-green-50/50'
                    )}
                  >
                    <TableCell className="font-medium">
                      Week {payment.week_number}
                    </TableCell>
                    <TableCell>
                      {payment.due_date
                        ? formatDate(payment.due_date)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(payment.amount_due || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(payment.paid_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{(payment.balance || payment.amount_due || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status !== 'paid' && payment.status !== 'waived' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkPaid(payment.id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      <Dialog open={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for this rental entry
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentId && (
            <RentalPaymentForm
              paymentId={selectedPaymentId}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setIsPaymentFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
