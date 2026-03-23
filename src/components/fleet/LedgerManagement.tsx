import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Calendar, User, Eye, Pause, Play, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { useRiderLedgers, type RiderLedger } from "@/hooks/useRiderLedgers";
import { CreateLedgerForm } from "./CreateLedgerForm";
import { PaymentHistoryDialog } from "./PaymentHistoryDialog";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import { toast } from "sonner";

export const LedgerManagement = () => {
  const {
    ledgers,
    loading,
    pauseLedger,
    canReactivate,
    reactivateLedger,
    markDepositRefunded
  } = useRiderLedgers();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRiderForHistory, setSelectedRiderForHistory] = useState<{
    riderId: string;
    riderName: string;
    ledgerId?: string;
  } | null>(null);

  // Pause dialog state
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseLedgerId, setPauseLedgerId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [isPausing, setIsPausing] = useState(false);

  // Reactivate dialog state
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [reactivateLedgerId, setReactivateLedgerId] = useState<string | null>(null);
  const [reactivateParams, setReactivateParams] = useState({
    start_date: '',
    rental_amount: 0,
    rental_frequency: 'weekly' as const,
    new_security_deposit: 0
  });
  const [reactivationEligibility, setReactivationEligibility] = useState<{
    eligible: boolean;
    reasons: string[];
  } | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Deposit refund dialog state
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundLedgerId, setRefundLedgerId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState<number | undefined>(undefined);
  const [isRefunding, setIsRefunding] = useState(false);

  // Use fuzzy search for ledgers
  const {
    results: filteredLedgers,
    searchTerm,
    setSearchTerm,
  } = useFuzzySearch(
    ledgers,
    ['rider_name', 'rider_id'],
    { threshold: 0.3 }
  );

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
  const handleCheckReactivation = async (ledgerId: string) => {
    const ledger = ledgers.find(l => l.id === ledgerId);
    if (!ledger) return;

    const eligibility = await canReactivate(ledger.rider_id);
    setReactivationEligibility(eligibility);
    setReactivateLedgerId(ledgerId);
    setReactivateParams({
      start_date: new Date().toISOString().split('T')[0],
      rental_amount: ledger.rental_amount,
      rental_frequency: ledger.rental_frequency,
      new_security_deposit: ledger.security_deposit_status !== 'retained' ? ledger.security_deposit_amount : 0
    });
    setIsReactivateDialogOpen(true);
  };

  const handleReactivateLedger = async () => {
    if (!reactivateLedgerId) return;
    setIsReactivating(true);
    try {
      await reactivateLedger(reactivateLedgerId, {
        start_date: reactivateParams.start_date,
        rental_amount: reactivateParams.rental_amount,
        rental_frequency: reactivateParams.rental_frequency,
        new_security_deposit: reactivateParams.new_security_deposit > 0 ? reactivateParams.new_security_deposit : undefined
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
            <CreateLedgerForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Daily Rentals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ledgers.filter(l => l.rental_frequency === 'daily').length}
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
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by rider name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Ledgers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Security Deposit</TableHead>
                  <TableHead>Rental Details</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedgers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No ledgers found matching your search." : "No ledgers created yet. Create your first ledger to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedgers.map((ledger) => (
                    <TableRow key={ledger.id} className={ledger.status === 'paused' ? 'bg-amber-50/50' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ledger.rider_name}</div>
                          <div className="text-sm text-muted-foreground">{ledger.rider_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(ledger.status)}
                          {ledger.status === 'paused' && ledger.paused_at && (
                            <div className="text-xs text-muted-foreground">
                              Paused: {new Date(ledger.paused_at).toLocaleDateString()}
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
                          {new Date(ledger.rental_start_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {/* View Payment History */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRiderForHistory({
                              riderId: ledger.rider_id,
                              riderName: ledger.rider_name,
                              ledgerId: ledger.id
                            })}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
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

      {/* Payment History Dialog */}
      {selectedRiderForHistory && (
        <PaymentHistoryDialog
          open={!!selectedRiderForHistory}
          onOpenChange={(open) => !open && setSelectedRiderForHistory(null)}
          riderId={selectedRiderForHistory.riderId}
          riderName={selectedRiderForHistory.riderName}
          ledgerId={selectedRiderForHistory.ledgerId}
        />
      )}

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
              Resume payment generation for this ledger. Existing pending payments will be replaced.
            </DialogDescription>
          </DialogHeader>

          {/* Eligibility Check */}
          {reactivationEligibility && !reactivationEligibility.eligible && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Cannot reactivate:</div>
                <ul className="list-disc list-inside text-sm">
                  {reactivationEligibility.reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {reactivationEligibility?.eligible && (
            <>
              <div className="grid gap-4 py-4">
                {/* Start Date */}
                <div className="grid gap-2">
                  <Label htmlFor="startDate">New Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={reactivateParams.start_date}
                    onChange={(e) => setReactivateParams(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    First payment will be due on this date
                  </p>
                </div>

                {/* Rental Amount */}
                <div className="grid gap-2">
                  <Label htmlFor="rentalAmount">Rental Amount (₹)</Label>
                  <Input
                    id="rentalAmount"
                    type="number"
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

                {/* Security Deposit - required if refunded */}
                {reactivationEligibility.ledger?.security_deposit_status !== 'retained' && (
                  <div className="grid gap-2">
                    <Label htmlFor="newDeposit">New Security Deposit (₹) *</Label>
                    <Input
                      id="newDeposit"
                      type="number"
                      value={reactivateParams.new_security_deposit}
                      onChange={(e) => setReactivateParams(prev => ({ ...prev, new_security_deposit: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-amber-600">
                      Previous deposit was {reactivationEligibility.ledger?.security_deposit_status}. New deposit required.
                    </p>
                  </div>
                )}

                {/* Cycle Change Warning */}
                {reactivationEligibility.ledger &&
                  reactivateParams.rental_frequency !== reactivationEligibility.ledger.rental_frequency && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Payment cycle changed from {reactivationEligibility.ledger.rental_frequency} to {reactivateParams.rental_frequency}.
                      New payments will follow the new schedule.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReactivateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleReactivateLedger}
                  disabled={isReactivating || !reactivateParams.start_date}
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