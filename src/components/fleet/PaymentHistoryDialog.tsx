import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/dateUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CreditCard, FileText, IndianRupee } from "lucide-react";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string;
  riderName: string;
  ledgerId?: string;
}

export const PaymentHistoryDialog = ({ 
  open, 
  onOpenChange, 
  riderId, 
  riderName, 
  ledgerId 
}: PaymentHistoryDialogProps) => {
  const { payments, loading } = usePaymentHistory(riderId, ledgerId);

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "default" as const,
      pending: "secondary" as const,
      overdue: "destructive" as const,
      partial: "outline" as const
    };
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>;
  };

  const getPaymentTypeBadge = (type: string) => {
    const variants = {
      rental: "outline" as const,
      security_deposit: "secondary" as const,
      maintenance: "default" as const,
      penalty: "destructive" as const
    };
    return <Badge variant={variants[type as keyof typeof variants] || "outline"}>
      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>;
  };

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalOverdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Payment History - {riderName} ({riderId})
          </DialogTitle>
        </DialogHeader>

        {/* Payment Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <IndianRupee className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₹{totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ₹{totalPending.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <CreditCard className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₹{totalOverdue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-muted-foreground">Loading payment history...</div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No payment records found for this rider.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.payment_id}
                      </TableCell>
                      <TableCell>
                        {getPaymentTypeBadge(payment.payment_type)}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{Number(payment.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.due_date)}
                      </TableCell>
                      <TableCell>
                        {payment.payment_date 
                          ? formatDate(payment.payment_date)
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {payment.payment_mode 
                          ? <Badge variant="outline">
                              {payment.payment_mode.replace('_', ' ').toUpperCase()}
                            </Badge>
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{payment.rental_period}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {payment.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};