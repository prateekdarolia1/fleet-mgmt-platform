import { useState } from "react";
import { format } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Calendar, IndianRupee, AlertCircle, CheckCircle, Shield, Receipt, Truck, User, Clock, Lock, AlertTriangle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { usePayments, type Payment, type PaymentStatus } from "@/hooks/usePayments";
import { useRiders } from "@/hooks/useRiders";
import { useVehicles } from "@/hooks/useVehicles";
import { useUnifiedOverduePayments, useUnifiedUpcomingPayments, type UnifiedOverduePayment, type UnifiedUpcomingPayment } from "@/hooks/useUnifiedPayments";
import { useFuzzySearchWithFilter } from "@/hooks/useFuzzySearch";
import { LedgerManagement } from "./LedgerManagement";
import { RentalLedgerDetail } from "./RentalLedgerDetail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

const downloadOverdueAsPDF = (
  payments: Array<{
    week_number?: number | null;
    payment_id?: string | null;
    rider_name?: string | null;
    rider_id: string;
    due_date?: string | null;
    amount_due?: number | null;
    balance?: number | null;
    status: string;
    source: string;
  }>,
  getMobile: (id: string) => string,
  getVehicle: (id: string) => string,
  getBattery: (id: string) => string,
  getOnboardedBy: (id: string) => string,
) => {
  if (!payments || payments.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = formatDate(new Date());
  const totalBalance = payments.reduce((sum, p) => sum + (p.balance ?? p.amount_due ?? 0), 0);

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LilyPad Fleet — Overdue Payments Report', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${today}`, 14, 25);
  doc.text(`Total overdue: ${payments.length} payments`, 14, 31);
  doc.text(
    `Total balance outstanding: Rs ${totalBalance.toLocaleString('en-IN')}`,
    14, 37,
  );
  doc.setTextColor(0);

  // Table
  autoTable(doc, {
    startY: 44,
    head: [['#', 'Week / ID', 'Rider', 'TL', 'Mobile', 'Vehicle', 'Battery ID', 'Due Date', 'Amount Due', 'Balance', 'Status']],
    body: payments.map((p, i) => [
      i + 1,
      p.source === 'rental_payments' ? `Week ${p.week_number}` : (p.payment_id || '—'),
      p.rider_name || 'Unknown',
      getOnboardedBy(p.rider_id),
      getMobile(p.rider_id),
      getVehicle(p.rider_id),
      getBattery(p.rider_id),
      p.due_date ? formatDate(p.due_date) : '—',
      `Rs ${(p.amount_due ?? 0).toLocaleString('en-IN')}`,
      `Rs ${(p.balance ?? p.amount_due ?? 0).toLocaleString('en-IN')}`,
      p.status.toUpperCase(),
    ]),
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center' },
      8: { halign: 'right' },
      9: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      10: { halign: 'center' },
    },
    showFoot: 'lastPage',
    foot: [['', '', '', '', '', '', '', 'TOTAL', `Rs ${payments.reduce((s, p) => s + (p.amount_due ?? 0), 0).toLocaleString('en-IN')}`, `Rs ${totalBalance.toLocaleString('en-IN')}`, '']],
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [0, 0, 0] },
  });

  doc.save(`overdue_payments_${today.replace(/\//g, '-')}.pdf`);
  toast.success('PDF downloaded');
};

const downloadUpcomingAsPDF = (
  payments: Array<{
    week_number?: number | null;
    payment_id?: string | null;
    rider_name?: string | null;
    rider_id: string;
    due_date?: string | null;
    amount_due?: number | null;
    status: string;
    source: string;
  }>,
  getMobile: (id: string) => string,
  getVehicle: (id: string) => string,
  getBattery: (id: string) => string,
  getOnboardedBy: (id: string) => string,
) => {
  if (!payments || payments.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = formatDate(new Date());
  const totalDue = payments.reduce((sum, p) => sum + (p.amount_due ?? 0), 0);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LilyPad Fleet — Upcoming Payments Report', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${today}`, 14, 25);
  doc.text(`Payments due this week: ${payments.length}`, 14, 31);
  doc.text(`Total amount due: Rs ${totalDue.toLocaleString('en-IN')}`, 14, 37);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 44,
    head: [['#', 'Week / ID', 'Rider', 'TL', 'Mobile', 'Vehicle', 'Battery ID', 'Due Date', 'Amount Due', 'Status']],
    body: payments.map((p, i) => [
      i + 1,
      p.source === 'rental_payments' ? `Week ${p.week_number}` : (p.payment_id || '—'),
      p.rider_name || 'Unknown',
      getOnboardedBy(p.rider_id),
      getMobile(p.rider_id),
      getVehicle(p.rider_id),
      getBattery(p.rider_id),
      p.due_date ? formatDate(p.due_date) : '—',
      `Rs ${(p.amount_due ?? 0).toLocaleString('en-IN')}`,
      p.status.toUpperCase(),
    ]),
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      3: { halign: 'center' },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'center' },
    },
    showFoot: 'lastPage',
    foot: [['', '', '', '', '', '', '', 'TOTAL', `Rs ${totalDue.toLocaleString('en-IN')}`, '']],
    footStyles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [0, 0, 0] },
  });

  doc.save(`upcoming_payments_${today.replace(/\//g, '-')}.pdf`);
  toast.success('PDF downloaded');
};

export const PaymentTracking = () => {
  const { payments, loading, getTotalStats, updatePayment, markPaymentAsPaid, deletePayment } = usePayments();
  const { riders } = useRiders();
  const { vehicles } = useVehicles();

  // rider_id → vehicle (from vehicles table — source of truth for assignment)
  const riderVehicleMap = new Map(
    vehicles.filter(v => v.rider_id).map(v => [v.rider_id!, v])
  );

  // rider_id → rider (for mobile number)
  const riderMap = new Map(riders.map(r => [r.rider_id, r]));

  const getVehicleForRider = (riderId: string): string => {
    return riderVehicleMap.get(riderId)?.vehicle_number || '—';
  };

  const getBatteryForRider = (riderId: string): string => {
    return riderVehicleMap.get(riderId)?.battery_smart_id || '—';
  };

  const getMobileForRider = (riderId: string): string => {
    const rider = riderMap.get(riderId);
    return rider?.mobile_number || rider?.phone || '—';
  };

  const getOnboardedByForRider = (riderId: string): string => {
    return riderMap.get(riderId)?.onboarded_by || '—';
  };

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Safety check modal state for marking payments as paid
  const [isSafetyCheckOpen, setIsSafetyCheckOpen] = useState(false);
  const [safetyCheckPayment, setSafetyCheckPayment] = useState<Payment | null>(null);
  const [safetyCheckData, setSafetyCheckData] = useState({
    payment_mode: 'cash' as Payment['payment_mode'],
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    upi_last4: '',
    notes: ''
  });
  const [safetyCheckError, setSafetyCheckError] = useState<string | null>(null);
  const [isSafetyCheckSubmitting, setIsSafetyCheckSubmitting] = useState(false);

  const { data: overduePayments } = useUnifiedOverduePayments();
  const { data: upcomingPayments } = useUnifiedUpcomingPayments();

  // "Pending" KPI = sum of upcoming-this-week balances. Overdue is shown separately.
  const pendingThisWeekAmount = (upcomingPayments || []).reduce(
    (sum, p) => sum + (p.amount_due || 0),
    0
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [isLedgerDetailOpen, setIsLedgerDetailOpen] = useState(false);
  const [overdueTlFilter, setOverdueTlFilter] = useState<'all' | 'TL1' | 'TL2' | 'none'>('all');
  const [upcomingTlFilter, setUpcomingTlFilter] = useState<'all' | 'TL1' | 'TL2' | 'none'>('all');

  const matchesTlFilter = (riderId: string, filter: 'all' | 'TL1' | 'TL2' | 'none'): boolean => {
    if (filter === 'all') return true;
    const tl = riderMap.get(riderId)?.onboarded_by;
    if (filter === 'none') return !tl;
    return tl === filter;
  };

  const filteredOverduePayments = (overduePayments || []).filter(p =>
    matchesTlFilter(p.rider_id, overdueTlFilter)
  );
  const filteredUpcomingPayments = (upcomingPayments || []).filter(p =>
    matchesTlFilter(p.rider_id, upcomingTlFilter)
  );

  // Fuzzy search with status filter - results auto-sorted by relevance
  const { results: filteredPayments } = useFuzzySearchWithFilter(
    payments,
    ['rider_name', 'rider_id', 'payment_id', 'rental_period', 'notes'],
    statusFilter === "all" ? undefined : (payment: Payment) => payment.status === statusFilter,
    { threshold: 0.3 }
  );

  const getStatusBadge = (status: Payment['status']) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      overdue: 'destructive',
      partial: 'outline',
      cancelled: 'outline'
    } as const;

    const icons = {
      paid: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Calendar className="h-3 w-3 mr-1" />,
      overdue: <AlertCircle className="h-3 w-3 mr-1" />,
      partial: <AlertCircle className="h-3 w-3 mr-1" />,
      cancelled: <AlertTriangle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant={variants[status]} className={`flex items-center ${status === 'cancelled' ? 'text-muted-foreground' : ''}`}>
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

  // Helper function to check if a payment can be deleted
  const canDeletePaymentLocal = (payment: Payment): boolean => {
    return payment.status === 'pending' || payment.status === 'overdue';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ledgers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ledgers">Ledger Management</TabsTrigger>
          <TabsTrigger value="rental-payments">
            Rental Payments
            {overduePayments && overduePayments.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">
                {overduePayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
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
                <div className="text-2xl font-bold text-secondary-foreground">₹{pendingThisWeekAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Due this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {overduePayments?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  ₹{(overduePayments?.reduce((sum, p) => sum + (p.balance || p.amount_due || 0), 0) || 0).toLocaleString()} total overdue
                </div>
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
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                           <span className="text-sm">{formatDate(payment.due_date)}</span>
                         </div>
                       </TableCell>
                       <TableCell>
                         {payment.payment_date ? (
                           <span className="text-sm">{formatDate(payment.payment_date)}</span>
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
                                variant="outline"
                                disabled={markingPaidId === payment.id}
                                onClick={() => {
                                  // Track which payment is being marked
                                  setMarkingPaidId(payment.id);
                                  // Open safety check modal with prefilled defaults
                                  setSafetyCheckPayment(payment);
                                  setSafetyCheckData({
                                    payment_mode: 'cash',
                                    payment_date: format(new Date(), 'yyyy-MM-dd'),
                                    upi_last4: '',
                                    notes: ''
                                  });
                                  setSafetyCheckError(null);
                                  setIsSafetyCheckOpen(true);
                                }}
                              >
                                {markingPaidId === payment.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Mark Paid
                                  </>
                                )}
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
                <>
                  <div className="flex justify-between items-center mb-3 gap-2">
                    <Select value={overdueTlFilter} onValueChange={(v) => setOverdueTlFilter(v as typeof overdueTlFilter)}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All TLs</SelectItem>
                        <SelectItem value="TL1">TL1</SelectItem>
                        <SelectItem value="TL2">TL2</SelectItem>
                        <SelectItem value="none">No TL assigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={filteredOverduePayments.length === 0}
                      onClick={() => downloadOverdueAsPDF(
                        filteredOverduePayments,
                        getMobileForRider,
                        getVehicleForRider,
                        getBatteryForRider,
                        getOnboardedByForRider,
                      )}
                    >
                      <Download className="h-4 w-4" />
                      Download ({filteredOverduePayments.length})
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        <TableHead>Rider</TableHead>
                        <TableHead>TL</TableHead>
                        <TableHead>Mobile No.</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Battery Smart ID</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOverduePayments.map((payment) => (
                        <TableRow
                          key={`${payment.source}-${payment.id}`}
                          className="cursor-pointer hover:bg-red-50"
                          onClick={() => {
                            if (payment.ledger_id) {
                              setSelectedLedgerId(payment.ledger_id);
                              setIsLedgerDetailOpen(true);
                            }
                          }}
                        >
                          <TableCell className="font-medium">
                            {payment.source === 'rental_payments' ? `Week ${payment.week_number}` : payment.payment_id || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{payment.rider_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{payment.rider_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {riderMap.get(payment.rider_id)?.onboarded_by ? (
                              <Badge variant="outline" className="font-medium">
                                {riderMap.get(payment.rider_id)?.onboarded_by}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{getMobileForRider(payment.rider_id)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              {getVehicleForRider(payment.rider_id)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{getBatteryForRider(payment.rider_id)}</TableCell>
                          <TableCell>
                            {payment.due_date
                              ? formatDate(payment.due_date)
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(payment.amount_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            ₹{(payment.balance || payment.amount_due || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                {payment.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.ledger_id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLedgerId(payment.ledger_id!);
                                  setIsLedgerDetailOpen(true);
                                }}
                              >
                                View Ledger
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
                </>
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
                <>
                  <div className="flex justify-between items-center mb-3 gap-2">
                    <Select value={upcomingTlFilter} onValueChange={(v) => setUpcomingTlFilter(v as typeof upcomingTlFilter)}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All TLs</SelectItem>
                        <SelectItem value="TL1">TL1</SelectItem>
                        <SelectItem value="TL2">TL2</SelectItem>
                        <SelectItem value="none">No TL assigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={filteredUpcomingPayments.length === 0}
                      onClick={() => downloadUpcomingAsPDF(
                        filteredUpcomingPayments,
                        getMobileForRider,
                        getVehicleForRider,
                        getBatteryForRider,
                        getOnboardedByForRider,
                      )}
                    >
                      <Download className="h-4 w-4" />
                      Download ({filteredUpcomingPayments.length})
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Week</TableHead>
                            <TableHead>Rider</TableHead>
                            <TableHead>TL</TableHead>
                            <TableHead>Mobile No.</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Battery Smart ID</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Amount Due</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUpcomingPayments.map((payment) => (
                            <TableRow
                              key={`${payment.source}-${payment.id}`}
                              className="cursor-pointer hover:bg-amber-50"
                              onClick={() => {
                                if (payment.ledger_id) {
                                  setSelectedLedgerId(payment.ledger_id);
                                  setIsLedgerDetailOpen(true);
                                }
                              }}
                            >
                              <TableCell className="font-medium">
                                {payment.source === 'rental_payments' ? `Week ${payment.week_number}` : payment.payment_id || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {payment.rider_name || 'Unknown'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {riderMap.get(payment.rider_id)?.onboarded_by ? (
                                  <Badge variant="outline" className="font-medium">
                                    {riderMap.get(payment.rider_id)?.onboarded_by}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{getMobileForRider(payment.rider_id)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  {getVehicleForRider(payment.rider_id)}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{getBatteryForRider(payment.rider_id)}</TableCell>
                              <TableCell>
                                {payment.due_date
                                  ? formatDate(payment.due_date)
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{(payment.amount_due || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {payment.ledger_id ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLedgerId(payment.ledger_id!);
                                      setIsLedgerDetailOpen(true);
                                    }}
                                  >
                                    View Ledger
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </>
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
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Delete button - only for pending/overdue payments */}
            {editingPayment && canDeletePaymentLocal(editingPayment) && (
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Delete Payment
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={isUpdating}
                onClick={async () => {
                  if (!editingPayment) return;

                  // Validate amount
                  const amount = Number(editFormData.amount);
                  if (!amount || amount <= 0) {
                    toast.error('Please enter a valid positive amount');
                    return;
                  }

                  setIsUpdating(true);
                  try {
                    await updatePayment(editingPayment.id, {
                      amount,
                      status: editFormData.status,
                      payment_mode: editFormData.payment_mode,
                      payment_date: editFormData.payment_date || undefined,
                      notes: editFormData.notes || undefined
                    });
                    setIsEditDialogOpen(false);
                    toast.success('Payment updated successfully');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to update payment');
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>

          {/* Delete Confirmation Alert */}
          {showDeleteConfirm && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Are you sure you want to cancel this payment? This action cannot be undone.</span>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No, Keep It
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (!editingPayment) return;
                      setIsDeleting(true);
                      try {
                        await deletePayment(editingPayment.id);
                        setShowDeleteConfirm(false);
                        setIsEditDialogOpen(false);
                      } catch (error) {
                        // Error toast is handled in the hook
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                  >
                    Yes, Cancel Payment
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Safety Check Modal for Marking Payments as Paid */}
      <Dialog open={isSafetyCheckOpen} onOpenChange={setIsSafetyCheckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Confirm Payment Collection
            </DialogTitle>
            <DialogDescription>
              Verify payment details before marking as paid
            </DialogDescription>
          </DialogHeader>

          {/* Locked Amount Section */}
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Amount (Locked)</span>
              </div>
              <div className="flex items-center gap-1 text-xl font-bold">
                <IndianRupee className="h-4 w-4" />
                <span>{safetyCheckPayment?.amount.toLocaleString() || 0}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Payment ID: {safetyCheckPayment?.payment_id} | Rider: {safetyCheckPayment?.rider_name}
            </div>
          </div>

          {/* Error Alert */}
          {safetyCheckError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{safetyCheckError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            {/* Payment Mode Selection */}
            <div className="grid gap-2">
              <Label htmlFor="safetyPaymentMode">Payment Mode *</Label>
              <Select
                value={safetyCheckData.payment_mode}
                onValueChange={(value) => {
                  setSafetyCheckData(prev => ({ ...prev, payment_mode: value as Payment['payment_mode'] }));
                  setSafetyCheckError(null);
                }}
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

            {/* UPI Last 4 Digits - Required for UPI payments */}
            {safetyCheckData.payment_mode === 'upi' && (
              <div className="grid gap-2">
                <Label htmlFor="safetyUpiLast4">
                  UPI Last 4 Digits (e.g., ab12@bank) *
                </Label>
                <Input
                  id="safetyUpiLast4"
                  value={safetyCheckData.upi_last4}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().slice(0, 4);
                    setSafetyCheckData(prev => ({ ...prev, upi_last4: value }));
                    setSafetyCheckError(null);
                  }}
                  placeholder="e.g., A1B2"
                  maxLength={4}
                  className={safetyCheckData.upi_last4 && !/^[A-Z0-9]{4}$/.test(safetyCheckData.upi_last4) ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the last 4 alphanumeric characters before @ in the UPI ID for verification
                </p>
                {safetyCheckData.upi_last4 && !/^[A-Z0-9]{4}$/.test(safetyCheckData.upi_last4) && (
                  <p className="text-xs text-red-500">Must be exactly 4 alphanumeric characters</p>
                )}
              </div>
            )}

            {/* Payment Date - Prefilled with today */}
            <div className="grid gap-2">
              <Label htmlFor="safetyPaymentDate">Payment Date</Label>
              <Input
                id="safetyPaymentDate"
                type="date"
                value={safetyCheckData.payment_date}
                onChange={(e) => setSafetyCheckData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>

            {/* Notes Field */}
            <div className="grid gap-2">
              <Label htmlFor="safetyNotes">Notes (Optional)</Label>
              <Input
                id="safetyNotes"
                value={safetyCheckData.notes}
                onChange={(e) => setSafetyCheckData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            {/* Delete button - only for pending/overdue payments */}
            {safetyCheckPayment && canDeletePaymentLocal(safetyCheckPayment) && (
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto order-3 sm:order-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Delete Payment
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto order-1 sm:order-2">
              <Button variant="outline" className="flex-1 sm:flex-initial" onClick={() => {
                setIsSafetyCheckOpen(false);
                setMarkingPaidId(null);
              }}>
                Cancel
              </Button>
              <Button
                className="flex-1 sm:flex-initial"
                disabled={isSafetyCheckSubmitting}
                onClick={async () => {
                // Validation
                if (safetyCheckData.payment_mode === 'upi') {
                  if (!safetyCheckData.upi_last4 || !/^[A-Z0-9]{4}$/.test(safetyCheckData.upi_last4)) {
                    setSafetyCheckError('UPI last 4 digits are required for UPI payments. Must be exactly 4 alphanumeric characters.');
                    return;
                  }
                }

                if (!safetyCheckPayment) return;

                setIsSafetyCheckSubmitting(true);
                setSafetyCheckError(null);

                try {
                  // Format notes to include UPI verification info
                  let formattedNotes = safetyCheckData.notes || '';
                  if (safetyCheckData.payment_mode === 'upi' && safetyCheckData.upi_last4) {
                    formattedNotes = `UPI ID last 4: ${safetyCheckData.upi_last4.toUpperCase()}${formattedNotes ? ` | ${formattedNotes}` : ''}`;
                  }

                  await updatePayment(safetyCheckPayment.id, {
                    status: 'paid',
                    payment_mode: safetyCheckData.payment_mode,
                    payment_date: safetyCheckData.payment_date,
                    notes: formattedNotes || undefined
                  });

                  setIsSafetyCheckOpen(false);
                  setSafetyCheckPayment(null);
                  setMarkingPaidId(null);
                  setSafetyCheckData({
                    payment_mode: 'cash',
                    payment_date: format(new Date(), 'yyyy-MM-dd'),
                    upi_last4: '',
                    notes: ''
                  });
                } catch (error) {
                  setSafetyCheckError(error instanceof Error ? error.message : 'Failed to update payment');
                } finally {
                  setIsSafetyCheckSubmitting(false);
                  setMarkingPaidId(null);
                }
              }}
            >
              {isSafetyCheckSubmitting ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 animate-pulse" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
            </div>
          </DialogFooter>

          {/* Delete Confirmation Alert - for Safety Check modal */}
          {showDeleteConfirm && safetyCheckPayment && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Are you sure you want to cancel this payment? This action cannot be undone.</span>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    No, Keep It
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await deletePayment(safetyCheckPayment.id);
                        setShowDeleteConfirm(false);
                        setIsSafetyCheckOpen(false);
                        setSafetyCheckPayment(null);
                      } catch (error) {
                        // Error toast is handled in the hook
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                  >
                    Yes, Cancel Payment
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};