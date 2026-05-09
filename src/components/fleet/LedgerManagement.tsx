import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useTableSort } from "@/hooks/useTableSort";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Calendar, User, Eye, Pause, Play, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { useRiderLedgers, type RiderLedger } from "@/hooks/useRiderLedgers";
import { formatDate } from "@/lib/dateUtils";
import { useVehicles } from "@/hooks/useVehicles";
import { useRiders } from "@/hooks/useRiders";
import { CreateLedgerForm } from "./CreateLedgerForm";
import { RentalLedgerDetail } from "./RentalLedgerDetail";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import { toast } from "sonner";

export const LedgerManagement = () => {
  const {
    ledgers,
    loading,
    pauseLedger,
    canReactivate,
    reactivateLedger,
    markDepositRefunded,
    refetch
  } = useRiderLedgers();
  const { vehicles } = useVehicles();
  const { riders } = useRiders();

  // Map rider_id → vehicle for quick lookup
  const riderVehicleMap = new Map(
    vehicles.filter(v => v.rider_id).map(v => [v.rider_id!, v])
  );

  // Map rider_id → rider for mobile number lookup
  const riderMap = new Map(riders.map(r => [r.rider_id, r]));
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedLedgerIdForDetail, setSelectedLedgerIdForDetail] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Resolve the rental_ledger ID for a given ledger entry.
  // rental_ledgers entries use their own ID directly.
  // rider_ledgers entries look up the matching rental_ledger by rider_id.
  const resolveRentalLedgerId = (ledger: RiderLedger): string | null => {
    if (ledger._source === 'rental_ledgers') return ledger.id;
    const match = ledgers.find(l => l._source === 'rental_ledgers' && l.rider_id === ledger.rider_id);
    return match?.id ?? ledger.id;
  };

  // Pause dialog state
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseLedgerId, setPauseLedgerId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [isPausing, setIsPausing] = useState(false);

  // Reactivate dialog state
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [reactivateLedgerId, setReactivateLedgerId] = useState<string | null>(null);
  const [reactivateParams, setReactivateParams] = useState<{
    start_date: string;
    rental_amount: number;
    rental_frequency: 'daily' | 'weekly' | 'monthly';
    new_security_deposit: number;
    deposit_payment_mode?: 'cash' | 'upi' | 'bank-transfer' | 'card' | 'other';
    deposit_upi_last4: string;
    deposit_collected_at: string;
  }>({
    start_date: '',
    rental_amount: 0,
    rental_frequency: 'weekly',
    new_security_deposit: 0,
    deposit_payment_mode: undefined,
    deposit_upi_last4: '',
    deposit_collected_at: '',
  });
  const [reactivationEligibility, setReactivationEligibility] = useState<{
    eligible: boolean;
    reasons: string[];
    ledger?: RiderLedger;
  } | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Deposit refund dialog state
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundLedgerId, setRefundLedgerId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number | undefined>(undefined);
  const [isRefunding, setIsRefunding] = useState(false);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'closed'>('all');

  // Enrich ledgers with mobile + vehicle so fuzzy search can match on them
  const searchableLedgers = useMemo(
    () => ledgers.map(l => {
      const r = riderMap.get(l.rider_id);
      const v = riderVehicleMap.get(l.rider_id);
      return {
        ...l,
        _search_mobile: r?.mobile_number || r?.phone || '',
        _search_vehicle: v?.vehicle_number || '',
      };
    }),
    [ledgers, riderMap, riderVehicleMap]
  );

  // Use fuzzy search for ledgers
  const {
    results: searchResults,
    searchTerm,
    setSearchTerm,
  } = useFuzzySearch(
    searchableLedgers,
    ['rider_name', 'rider_id', '_search_mobile', '_search_vehicle'],
    { threshold: 0.3 }
  );

  // Apply status filter to search results
  const filteredLedgers = statusFilter === 'all'
    ? searchResults
    : searchResults.filter(ledger => ledger.status === statusFilter);

  const ledgersSort = useTableSort(filteredLedgers, {
    rider: (l) => l.rider_name,
    mobile: (l) => {
      const r = riderMap.get(l.rider_id);
      return r?.mobile_number || r?.phone || null;
    },
    vehicle: (l) => riderVehicleMap.get(l.rider_id)?.vehicle_number ?? null,
    battery: (l) => riderVehicleMap.get(l.rider_id)?.battery_smart_id ?? null,
    status: (l) => l.status,
    deposit: (l) => Number(l.security_deposit_amount),
    frequency: (l) => l.rental_frequency,
    start_date: (l) => l.rental_start_date,
  });

  const getFrequencyBadge = (frequency: string) => {
    const variants = {
      daily: "default" as const,
      weekly: "secondary" as const,
      monthly: "outline" as const
    };
    return <Badge variant={variants[frequency as keyof typeof variants]}>{frequency.charAt(0).toUpperCase() + frequency.slice(1)}</Badge>;
  };

  const getStatusBadge = (status: RiderLedger['status']) => {
    const variants = {
      active: "default" as const,
      paused: "secondary" as const,
      closed: "outline" as const
    };
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      paused: "bg-amber-100 text-amber-800 border-amber-200",
      closed: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDepositStatusBadge = (status: RiderLedger['security_deposit_status']) => {
    const variants = {
      retained: "default" as const,
      refunded: "secondary" as const,
      partially_refunded: "outline" as const
    };
    const colors = {
      retained: "bg-blue-100 text-blue-800",
      refunded: "bg-gray-100 text-gray-600",
      partially_refunded: "bg-orange-100 text-orange-800"
    };
    const labels = {
      retained: "Retained",
      refunded: "Refunded",
      partially_refunded: "Partial Refund"
    };
    return (
      <Badge variant={variants[status]} className={`text-xs ${colors[status]}`}>
        {labels[status]}
      </Badge>
    );
  };

  // Handle pause ledger
  const handlePauseLedger = async () => {
    if (!pauseLedgerId || !pauseReason.trim()) {
      toast.error('Please provide a reason for pausing');
      return;
    }
    setIsPausing(true);
    try {
      await pauseLedger(pauseLedgerId, pauseReason);
      setIsPauseDialogOpen(false);
      setPauseLedgerId(null);
      setPauseReason('');
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsPausing(false);
    }
  };

  // Handle reactivate ledger
  const handleCheckReactivation = (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return;

    const rider = riderMap.get(ledger.rider_id);
    const eligibility = canReactivate(ledger.rider_id, rider);
    setReactivationEligibility(eligibility);
    setReactivateLedgerId(ledgerId);
    setReactivateParams({
      start_date: new Date().toISOString().split('T')[0],
      rental_amount: ledger.rental_amount,
      rental_frequency: ledger.rental_frequency,
      new_security_deposit: 0,
      deposit_payment_mode: undefined,
      deposit_upi_last4: '',
      deposit_collected_at: new Date().toISOString().split('T')[0],
    });
    setIsReactivateDialogOpen(true);
  };

  const handleReactivateLedger = async () => {
    if (!reactivateLedgerId) return;
    setIsReactivating(true);
    try {
      const collectingDeposit = reactivateParams.new_security_deposit > 0;
      await reactivateLedger(reactivateLedgerId, {
        start_date: reactivateParams.start_date,
        rental_amount: reactivateParams.rental_amount,
        rental_frequency: reactivateParams.rental_frequency,
        new_security_deposit: collectingDeposit ? reactivateParams.new_security_deposit : undefined,
        deposit_payment_mode: collectingDeposit ? reactivateParams.deposit_payment_mode : undefined,
        deposit_upi_last4: collectingDeposit && reactivateParams.deposit_payment_mode === 'upi'
          ? reactivateParams.deposit_upi_last4 || undefined
          : undefined,
        deposit_collected_at: collectingDeposit ? reactivateParams.deposit_collected_at : undefined,
      });
      setIsReactivateDialogOpen(false);
      setReactivateLedgerId(null);
      setReactivationEligibility(null);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsReactivating(false);
    }
  };

  // Handle deposit refund
  const handleMarkRefunded = async () => {
    if (!refundLedgerId) return;
    setIsRefunding(true);
    try {
      await markDepositRefunded(refundLedgerId, refundAmount);
      setIsRefundDialogOpen(false);
      setRefundLedgerId(null);
      setRefundAmount(undefined);
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsRefunding(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Loading ledgers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ledger Management</h2>
          <p className="text-muted-foreground">Manage rider payment ledgers and track rental payments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Ledger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Rider Ledger</DialogTitle>
            </DialogHeader>
            <CreateLedgerForm onSuccess={() => { setIsCreateDialogOpen(false); refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ledgers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ledgers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ledgers.filter(l => l.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {ledgers.filter(l => l.status === 'paused').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Rentals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ledgers.filter(l => l.rental_frequency === 'weekly').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rentals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ledgers.filter(l => l.rental_frequency === 'monthly').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Rider Ledgers</CardTitle>
          <CardDescription>View and manage all rider payment ledgers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, vehicle or rider ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ledgers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="rider" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Rider Details</SortableTableHead>
                  <SortableTableHead sortKey="mobile" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Mobile No.</SortableTableHead>
                  <SortableTableHead sortKey="vehicle" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Vehicle</SortableTableHead>
                  <SortableTableHead sortKey="battery" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Battery Smart ID</SortableTableHead>
                  <SortableTableHead sortKey="status" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Status</SortableTableHead>
                  <SortableTableHead sortKey="deposit" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Security Deposit</SortableTableHead>
                  <SortableTableHead sortKey="frequency" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Rental Details</SortableTableHead>
                  <SortableTableHead sortKey="start_date" currentKey={ledgersSort.sortKey} direction={ledgersSort.sortDir} onSort={ledgersSort.toggleSort}>Start Date</SortableTableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgersSort.sortedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No ledgers found matching your search." : "No ledgers created yet. Create your first ledger to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgersSort.sortedRows.map((ledger) => (
                    <TableRow key={ledger.id} className={ledger.status === 'paused' ? 'bg-amber-50/50' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ledger.rider_name}</div>
                          <div className="text-sm text-muted-foreground">{ledger.rider_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {riderMap.get(ledger.rider_id)?.mobile_number || riderMap.get(ledger.rider_id)?.phone || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const vehicle = riderVehicleMap.get(ledger.rider_id);
                          return vehicle
                            ? <span className="font-medium text-sm">{vehicle.vehicle_number}</span>
                            : <span className="text-sm text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const vehicle = riderVehicleMap.get(ledger.rider_id);
                          return vehicle?.battery_smart_id
                            ? <span className="text-sm">{vehicle.battery_smart_id}</span>
                            : <span className="text-sm text-muted-foreground">—</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(ledger.status)}
                          {ledger.status === 'paused' && ledger.paused_at && (
                            <div className="text-xs text-muted-foreground">
                              Paused: {formatDate(ledger.paused_at)}
                            </div>
                          )}
                          {ledger.status === 'paused' && ledger.paused_reason && (
                            <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 max-w-[200px] truncate" title={ledger.paused_reason}>
                              {ledger.paused_reason}
                            </div>
                          )}
                          {ledger.status === 'active' && ledger.reactivated_at && (
                            <div className="text-xs text-green-600">
                              Reactivated: {formatDate(ledger.reactivated_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>₹{Number(ledger.security_deposit_amount).toLocaleString()}</div>
                          {getDepositStatusBadge(ledger.security_deposit_status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getFrequencyBadge(ledger.rental_frequency)}
                            <span className="text-sm">₹{Number(ledger.rental_amount).toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(ledger.rental_start_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {/* View Ledger */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const id = resolveRentalLedgerId(ledger);
                              setSelectedLedgerIdForDetail(id);
                              setIsDetailOpen(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View Ledger
                          </Button>

                          {/* Pause button - only for active ledgers */}
                          {ledger.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPauseLedgerId(ledger.id);
                                setPauseReason('');
                                setIsPauseDialogOpen(true);
                              }}
                              className="flex items-center gap-1 text-amber-600 hover:text-amber-700"
                            >
                              <Pause className="h-3 w-3" />
                              Pause
                            </Button>
                          )}

                          {/* Reactivate button - only for paused ledgers */}
                          {ledger.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckReactivation(ledger.id)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-700"
                            >
                              <Play className="h-3 w-3" />
                              Reactivate
                            </Button>
                          )}

                          {/* Mark Refunded button - only for paused ledgers with retained deposit */}
                          {ledger.status === 'paused' && ledger.security_deposit_status === 'retained' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRefundLedgerId(ledger.id);
                                setRefundAmount(undefined);
                                setIsRefundDialogOpen(true);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Shield className="h-3 w-3" />
                              Mark Refunded
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

      {/* Rental Ledger Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rental Ledger</DialogTitle>
          </DialogHeader>
          {selectedLedgerIdForDetail && (
            <RentalLedgerDetail
              ledgerId={selectedLedgerIdForDetail}
              onBack={() => setIsDetailOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pause Ledger Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-amber-500" />
              Pause Ledger
            </DialogTitle>
            <DialogDescription>
              This will stop payment generation for this ledger. You can reactivate it later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pauseReason">Reason for pausing *</Label>
              <Textarea
                id="pauseReason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., Rider went on leave, Bike under maintenance..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePauseLedger}
              disabled={isPausing || !pauseReason.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isPausing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Pausing...
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Ledger
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Ledger Dialog */}
      <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500" />
              Reactivate Ledger
            </DialogTitle>
            <DialogDescription>
              Resume payments for this ledger. Past due dates generate overdue payments; the next upcoming date generates one pending payment.
            </DialogDescription>
          </DialogHeader>

          {reactivationEligibility && !reactivationEligibility.eligible && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {reactivationEligibility.reasons.length === 1 ? (
                  reactivationEligibility.reasons[0]
                ) : (
                  <>
                    <p className="mb-1 font-medium">This ledger can't be reactivated yet:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {reactivationEligibility.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {reactivationEligibility?.eligible && (
            <>
              <div className="grid gap-4 py-4">
                {/* Start Date */}
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Restart Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={reactivateParams.start_date}
                    onChange={(e) => setReactivateParams(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                {/* Rental Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="rentalAmount">Weekly Rental Amount (₹) *</Label>
                  <Input
                    id="rentalAmount"
                    type="number"
                    min={1}
                    value={reactivateParams.rental_amount}
                    onChange={(e) => setReactivateParams(prev => ({ ...prev, rental_amount: Number(e.target.value) }))}
                  />
                </div>

                {/* Rental Frequency */}
                <div className="grid gap-2">
                  <Label htmlFor="rentalFrequency">Rental Frequency</Label>
                  <Select
                    value={reactivateParams.rental_frequency}
                    onValueChange={(value) => setReactivateParams(prev => ({ ...prev, rental_frequency: value as 'daily' | 'weekly' | 'monthly' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Security Deposit — always shown, optional */}
                <div className="grid gap-2">
                  <Label htmlFor="newDeposit">Security Deposit (₹) <span className="text-muted-foreground font-normal">— optional</span></Label>
                  <Input
                    id="newDeposit"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={reactivateParams.new_security_deposit || ''}
                    onChange={(e) => setReactivateParams(prev => ({ ...prev, new_security_deposit: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave 0 if no deposit is being collected on reactivation.
                  </p>
                </div>

                {/* Deposit collection details — only when a deposit is being collected */}
                {reactivateParams.new_security_deposit > 0 && (
                  <div className="grid gap-3 rounded-lg border-2 border-blue-100 bg-blue-50/30 p-3">
                    <p className="text-sm font-semibold text-blue-900">Deposit Collection Details</p>

                    <div className="grid gap-2">
                      <Label htmlFor="depositMode">Payment Mode</Label>
                      <Select
                        value={reactivateParams.deposit_payment_mode || ''}
                        onValueChange={(value) => setReactivateParams(prev => ({ ...prev, deposit_payment_mode: value as 'cash' | 'upi' | 'bank-transfer' | 'card' | 'other' }))}
                      >
                        <SelectTrigger id="depositMode">
                          <SelectValue placeholder="Select mode..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {reactivateParams.deposit_payment_mode === 'upi' && (
                      <div className="grid gap-2">
                        <Label htmlFor="depositUpi">UPI Last 4 Characters</Label>
                        <Input
                          id="depositUpi"
                          placeholder="e.g., 4K9M"
                          maxLength={4}
                          value={reactivateParams.deposit_upi_last4}
                          onChange={(e) => setReactivateParams(prev => ({ ...prev, deposit_upi_last4: e.target.value.replace(/\s/g, '').toUpperCase() }))}
                          className="uppercase font-mono"
                        />
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="depositDate">Date Received</Label>
                      <Input
                        id="depositDate"
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={reactivateParams.deposit_collected_at}
                        onChange={(e) => setReactivateParams(prev => ({ ...prev, deposit_collected_at: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReactivateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReactivateLedger}
                  disabled={
                    isReactivating ||
                    !reactivateParams.start_date ||
                    reactivateParams.rental_amount <= 0 ||
                    (reactivateParams.new_security_deposit > 0 && !reactivateParams.deposit_payment_mode) ||
                    (reactivateParams.new_security_deposit > 0 && reactivateParams.deposit_payment_mode === 'upi' && (reactivateParams.deposit_upi_last4 || '').length !== 4)
                  }
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isReactivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Reactivate Ledger
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {reactivationEligibility?.eligible === false && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReactivateDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark Deposit Refunded Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Mark Deposit as Refunded
            </DialogTitle>
            <DialogDescription>
              Record that the security deposit has been returned to the rider.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="refundAmount">Refund Amount (₹) - Leave empty for full refund</Label>
              <Input
                id="refundAmount"
                type="number"
                value={refundAmount ?? ''}
                onChange={(e) => setRefundAmount(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Full refund if empty"
              />
              <p className="text-xs text-muted-foreground">
                Partial refund will set status to "Partially Refunded"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkRefunded}
              disabled={isRefunding}
              variant="secondary"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Mark as Refunded
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};