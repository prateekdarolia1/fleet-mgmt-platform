import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Calendar, IndianRupee, AlertCircle, CheckCircle } from "lucide-react";
import { usePayments, type Payment } from "@/hooks/usePayments";

export const PaymentTracking = () => {
  const { payments, loading, getTotalStats } = usePayments();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.rider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.rider_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Payment['status']) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      partial: 'outline'
    } as const;
    
    const icons = {
      paid: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Calendar className="h-3 w-3 mr-1" />,
      overdue: <AlertCircle className="h-3 w-3 mr-1" />,
      partial: <AlertCircle className="h-3 w-3 mr-1" />
    };
    
    return (
      <Badge variant={variants[status]} className="flex items-center">
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const getPaymentModeBadge = (mode?: Payment['payment_mode']) => {
    if (!mode) return <span className="text-muted-foreground">-</span>;
    
    const variants = {
      cash: 'default',
      upi: 'secondary', 
      'bank-transfer': 'outline',
      card: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[mode]} className="text-xs">
        {mode.toUpperCase()}
      </Badge>
    );
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All payment records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{stats.paidAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary-foreground">₹{stats.pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Payment(s) overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            Track and manage all rental payments and dues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by rider name, ID, or payment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Record New Payment</DialogTitle>
                  <DialogDescription>
                    Add a new payment record for a rider.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentRider">Rider</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="R001">Arjun Kumar (R001)</SelectItem>
                          <SelectItem value="R002">Priya Singh (R002)</SelectItem>
                          <SelectItem value="R003">Rajesh Patel (R003)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentAmount">Amount (₹)</Label>
                      <Input id="paymentAmount" type="number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentDueDate">Due Date</Label>
                      <Input id="paymentDueDate" type="date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMode">Payment Mode</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentPeriod">Rental Period</Label>
                    <Input id="paymentPeriod" placeholder="e.g., Jan 2024, Week 1 Feb 2024" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paymentNotes">Notes</Label>
                    <Input id="paymentNotes" placeholder="Additional notes..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Record Payment</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Payments Table */}
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Rider Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                 <TableCell className="font-medium">{payment.payment_id}</TableCell>
                 <TableCell>
                   <div>
                     <div className="font-medium">{payment.rider_name}</div>
                     <div className="text-sm text-muted-foreground">{payment.rider_id}</div>
                   </div>
                 </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      <span className="font-medium">{payment.amount.toLocaleString()}</span>
                    </div>
                  </TableCell>
                 <TableCell>
                   <div className="flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                     <span className="text-sm">{new Date(payment.due_date).toLocaleDateString()}</span>
                   </div>
                 </TableCell>
                 <TableCell>
                   {payment.payment_date ? (
                     <span className="text-sm">{new Date(payment.payment_date).toLocaleDateString()}</span>
                   ) : (
                     <span className="text-muted-foreground">-</span>
                   )}
                 </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{getPaymentModeBadge(payment.payment_mode)}</TableCell>
                 <TableCell>
                   <span className="text-sm">{payment.rental_period}</span>
                 </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      {payment.status === 'pending' && (
                        <Button size="sm">
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};