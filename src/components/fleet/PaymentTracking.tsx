import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Calendar, IndianRupee, AlertCircle, CheckCircle, Shield, Receipt, Truck, User, Clock } from "lucide-react";
import { usePayments, type Payment } from "@/hooks/usePayments";
import { useOverduePayments, useUpcomingPayments } from "@/hooks/useRentalPayments";
import { LedgerManagement } from "./LedgerManagement";
import { RentalLedgerDetail } from "./RentalLedgerDetail";

export const PaymentTracking = () => {
  const { payments, loading, getTotalStats, updatePayment, markPaymentAsPaid } = usePayments();

  // Edit payment state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    status: 'pending' as Payment['status'],
    payment_mode: 'cash' as Payment['payment_mode'],
    payment_date: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const { data: overduePayments } = useOverduePayments(50);
  const { data: upcomingPayments } = useUpcomingPayments(7);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [isLedgerDetailOpen, setIsLedgerDetailOpen] = useState(false);

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

  const getPaymentTypeBadge = (type: Payment['payment_type']) => {
    const variants = {
      security_deposit: 'default',
      rental: 'secondary'
    } as const;
    
    const icons = {
      security_deposit: <Shield className="h-3 w-3 mr-1" />,
      rental: <Receipt className="h-3 w-3 mr-1" />
    };
    
    return (
      <Badge variant={variants[type]} className="flex items-center">
        {icons[type]}
        {type === 'security_deposit' ? 'Security Deposit' : 'Rental'}
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
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="rental-payments">
            Rental Payments
            {overduePayments && overduePayments.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">
                {overduePayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ledgers">Ledger Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payments" className="space-y-6">
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
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {searchTerm || statusFilter !== "all" ? "No payments found matching your filters." : "No payments recorded yet. Create a ledger to generate payments automatically."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
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
                        <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPayment(payment);
                                setEditFormData({
                                  amount: payment.amount.toString(),
                                  status: payment.status,
                                  payment_mode: payment.payment_mode || 'cash',
                                  payment_date: payment.payment_date || '',
                                  notes: payment.notes || ''
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            {(payment.status === 'pending' || payment.status === 'overdue') && (
                              <Button
                                size="sm"
                                disabled={markingPaidId === payment.id}
                                onClick={async () => {
                                  setMarkingPaidId(payment.id);
                                  await markPaymentAsPaid(payment.id, 'cash');
                                  setMarkingPaidId(null);
                                }}
                              >
                                {markingPaidId === payment.id ? 'Marking...' : 'Mark Paid'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rental Payments Tab */}
        <TabsContent value="rental-payments" className="space-y-6">
          {/* Rental Payment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {overduePayments?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{overduePayments?.reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0).toLocaleString() || 0} total overdue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {upcomingPayments?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{upcomingPayments?.reduce((sum, p) => sum + (p.amount_due || 0), 0).toLocaleString() || 0} upcoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {/* Could trigger bulk reminder */}}
                >
                  Send Bulk Reminders
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Overdue Payments
              </CardTitle>
              <CardDescription>
                Payments past their due date - requires immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!overduePayments || overduePayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p>No overdue payments! All riders are up to date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overduePayments.map((payment) => (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer hover:bg-red-50"
                          onClick={() => {
                            setSelectedLedgerId(payment.ledger_id);
                            setIsLedgerDetailOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            Week {payment.week_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{payment.rental_ledgers?.rider_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{payment.rental_ledgers?.rider_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {payment.rental_ledgers?.vehicle_number || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.due_date
                              ? format(new Date(payment.due_date), 'dd MMM yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(payment.amount_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            ₹{(payment.balance || payment.amount_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLedgerId(payment.ledger_id);
                                setIsLedgerDetailOpen(true);
                              }}
                            >
                              View Ledger
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Due This Week
              </CardTitle>
              <CardDescription>
                Payments due within the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!upcomingPayments || upcomingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No payments due this week.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingPayments.map((payment) => (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer hover:bg-amber-50"
                          onClick={() => {
                            setSelectedLedgerId(payment.ledger_id);
                            setIsLedgerDetailOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">
                            Week {payment.week_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {payment.rental_ledgers?.rider_name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {payment.rental_ledgers?.vehicle_number || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {payment.due_date
                              ? format(new Date(payment.due_date), 'dd MMM yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{(payment.amount_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLedgerId(payment.ledger_id);
                                setIsLedgerDetailOpen(true);
                              }}
                            >
                              View Ledger
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledgers">
          <LedgerManagement />
        </TabsContent>
      </Tabs>

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

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update payment details for {editingPayment?.payment_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editAmount">Amount (₹)</Label>
              <Input
                id="editAmount"
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value as Payment['status'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPaymentMode">Payment Mode</Label>
              <Select
                value={editFormData.payment_mode}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, payment_mode: value as Payment['payment_mode'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPaymentDate">Payment Date</Label>
              <Input
                id="editPaymentDate"
                type="date"
                value={editFormData.payment_date}
                onChange={(e) => setEditFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Input
                id="editNotes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isUpdating}
              onClick={async () => {
                if (!editingPayment) return;
                setIsUpdating(true);
                await updatePayment(editingPayment.id, {
                  amount: Number(editFormData.amount),
                  status: editFormData.status,
                  payment_mode: editFormData.payment_mode,
                  payment_date: editFormData.payment_date || undefined,
                  notes: editFormData.notes || undefined
                });
                setIsUpdating(false);
                setIsEditDialogOpen(false);
              }}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};