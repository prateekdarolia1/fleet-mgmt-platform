import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, Filter, Phone, Mail, Calendar, User, Edit } from "lucide-react";
import { useRiders, type Rider } from "@/hooks/useRiders";
import { useVehicles, type Vehicle } from "@/hooks/useVehicles";
import { useCreateRentalLedger } from "@/hooks/useRentalLedgers";
import { useFuzzySearchWithFilter } from "@/hooks/useFuzzySearch";
import { AddRiderForm } from "./AddRiderForm";
import { RiderActivationModal } from "./RiderActivationModal";
import { RentalLedgerConfirmModal } from "./RentalLedgerConfirmModal";
import { toast } from "sonner";

interface RiderFormData {
  // Section 1: Personal Information
  first_name: string;
  last_name: string;
  mobile_number: string;
  dob: string;
  aadhaar_number: string;
  pan_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  address_google_link: string;
  marital_status: 'SINGLE' | 'MARRIED';
  dependent_name?: string;
  dependent_relation?: 'FATHER' | 'MOTHER' | 'BROTHER' | 'SPOUSE' | 'OTHER';
  dependent_aadhaar?: string;
  
  // Section 2: Banking Information
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  account_number: string;
  
  // Section 3: Employment Information
  aggregator: 'SWIGGY' | 'ZOMATO' | 'ZEPTO' | 'BLINKIT' | 'BIGBASKET' | 'OTHER';
  aggregator_other?: string;
  aggregator_id: string;
  joined_since: string;
  avg_earnings_15_days: number;
  
  // Section 4: Office Use
  onboarded_by: 'SHUBHAM' | 'VAIBHAV';
  aggregator_credentials_checked: boolean;
  id_credentials_checked: boolean;
  retained_document_details: string;
}

export const RiderManagement = () => {
  const navigate = useNavigate();
  const { riders, loading, addRider, updateRider } = useRiders();
  const { vehicles, updateVehicle } = useVehicles();
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddRiderOpen, setIsAddRiderOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [isViewRiderOpen, setIsViewRiderOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isActivationLoading, setIsActivationLoading] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    riderStatus: Rider['status'];
    dutyStatus: string;
    originalDutyStatus: string;
  } | null>(null);

  // Rental ledger state
  const createRentalLedger = useCreateRentalLedger();
  const [isRentalConfirmModalOpen, setIsRentalConfirmModalOpen] = useState(false);
  const [newLedgerId, setNewLedgerId] = useState<string | null>(null);
  const [activatedRiderInfo, setActivatedRiderInfo] = useState<{
    name: string;
    vehicleNumber: string | null;
    riderId: string;
  } | null>(null);

  const form = useForm<RiderFormData>();

  const handleViewRider = (rider: Rider) => {
    setSelectedRider(rider);
    setIsViewRiderOpen(true);
  };

  const handleEditStatus = (rider: Rider) => {
    setEditingRider(rider);
    setIsEditStatusOpen(true);
  };

  const handleEditRiderDetails = (rider: Rider) => {
    setEditingRider(rider);
    setIsEditDetailsOpen(true);
  };

  const handleStatusUpdate = async (newStatus: Rider['status'], newDutyStatus: string) => {
    if (!editingRider) return;

    const currentDutyStatus = editingRider.duty_status || 'IDLE';

    // Check if changing from IDLE to LIVE - require vehicle + battery selection
    if (currentDutyStatus === 'IDLE' && newDutyStatus === 'LIVE') {
      setPendingStatusUpdate({
        riderStatus: newStatus,
        dutyStatus: newDutyStatus,
        originalDutyStatus: currentDutyStatus
      });
      setIsEditStatusOpen(false); // Close status edit dialog
      setIsActivationModalOpen(true); // Open activation modal
      return;
    }

    // Check if changing from LIVE to IDLE - unassign vehicle
    if (currentDutyStatus === 'LIVE' && newDutyStatus === 'IDLE') {
      await handleVehicleUnassignment(newStatus, newDutyStatus);
      return;
    }

    // Regular status update (no vehicle assignment needed)
    try {
      await updateRider(editingRider.id, {
        status: newStatus,
        duty_status: newDutyStatus
      });
      setIsEditStatusOpen(false);
      setEditingRider(null);
    } catch (error) {
      console.error('Error updating rider status:', error);
      toast.error('Failed to update rider status');
    }
  };

  /**
   * Handle rider activation with vehicle + battery assignment
   * Called from RiderActivationModal when user confirms
   * After successful activation, creates a rental ledger and opens confirmation modal
   */
  const handleRiderActivation = async (
    vehicleId: string,
    batterySmartId: string
  ) => {
    if (!editingRider || !pendingStatusUpdate) return;

    setIsActivationLoading(true);
    try {
      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
      if (!selectedVehicle) {
        toast.error('Vehicle not found');
        return;
      }

      // CBU Validation: Vehicle must have a battery mapped before activation
      if (!selectedVehicle.battery_id) {
        toast.error('Cannot activate rider: Vehicle does not have a battery mapped. Complete the Business Unit first.');
        setIsActivationLoading(false);
        return;
      }

      // Update rider with:
      // - New status (Active)
      // - Vehicle assignment
      // - Battery Smart ID (for performance tracking)
      await updateRider(editingRider.id, {
        status: pendingStatusUpdate.riderStatus,
        duty_status: pendingStatusUpdate.dutyStatus,
        vehicle_assigned: selectedVehicle.vehicle_number,
        battery_smart_id: batterySmartId
      });

      // Update vehicle status to Deployed and assign rider
      await updateVehicle(vehicleId, {
        status: 'Deployed' as const,
        rider_id: editingRider.rider_id,
        rider_name: editingRider.name
      });

      // Success feedback
      toast.success(
        `${editingRider.name} activated with ${selectedVehicle.vehicle_number} (Battery Smart ID: ${batterySmartId})`
      );

      // Create rental ledger for the activated rider
      try {
        const ledgerId = await createRentalLedger.mutateAsync({
          rider_id: editingRider.rider_id,
          vehicle_id: vehicleId
        });

        // Store rider info for the confirmation modal
        setActivatedRiderInfo({
          name: editingRider.name,
          vehicleNumber: selectedVehicle.vehicle_number,
          riderId: editingRider.rider_id
        });
        setNewLedgerId(ledgerId);

        // Close activation modal and open rental confirmation modal
        setIsActivationModalOpen(false);
        setIsRentalConfirmModalOpen(true);

      } catch (ledgerError) {
        console.error('Error creating rental ledger:', ledgerError);
        // Don't block the activation, just show a warning
        toast.warning('Rider activated, but rental ledger creation failed. Please create manually.');
        setIsActivationModalOpen(false);
      }

      // Reset state
      setEditingRider(null);
      setPendingStatusUpdate(null);
    } catch (error) {
      console.error('Error activating rider:', error);
      toast.error('Failed to activate rider. Please try again.');
    } finally {
      setIsActivationLoading(false);
    }
  };

  /**
   * Handle rental confirmation success
   */
  const handleRentalConfirmSuccess = () => {
    setNewLedgerId(null);
    setActivatedRiderInfo(null);
    setIsRentalConfirmModalOpen(false);
  };

  const handleVehicleUnassignment = async (newStatus: Rider['status'], newDutyStatus: string) => {
    if (!editingRider) return;
    
    try {
      // Find the vehicle assigned to this rider
      const assignedVehicle = vehicles.find(v => v.rider_id === editingRider.rider_id);
      
      // Update rider status and remove vehicle assignment
      await updateRider(editingRider.id, {
        status: newStatus,
        duty_status: newDutyStatus,
        vehicle_assigned: null
      });
      
      // Update vehicle status back to Ready for Deployment
      if (assignedVehicle) {
        await updateVehicle(assignedVehicle.id, {
          status: 'Ready for Deployment' as const,
          rider_id: null,
          rider_name: null
        });
      }
      
      setIsEditStatusOpen(false);
      setEditingRider(null);
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
    }
  };

  const handleVehicleSelectionCancel = () => {
    setIsVehicleSelectionOpen(false);
    setSelectedVehicleId("");
    setPendingStatusUpdate(null);
    // Status stays as original, no changes made
  };

  const onSubmit = async (data: RiderFormData) => {
    try {
      await addRider(data);
      setIsAddRiderOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding rider:', error);
    }
  };

  // Use fuzzy search with status filter
  const {
    results: filteredRiders,
    searchTerm: fuzzySearchTerm,
    setSearchTerm: setFuzzySearchTerm,
  } = useFuzzySearchWithFilter(
    riders,
    ['name', 'phone', 'rider_id'],
    statusFilter === "all" ? undefined : (rider: Rider) => rider.status === statusFilter,
    { threshold: 0.3 }
  );

  const getStatusBadge = (status: Rider['status']) => {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (status === 'active') {
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">{statusText}</Badge>;
    }
    
    if (status === 'inactive') {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{statusText}</Badge>;
    }
    
    const variants = {
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{statusText}</Badge>;
  };

  const getPlanBadge = (plan: Rider['rental_plan']) => {
    const variants = {
      daily: 'outline',
      weekly: 'secondary',
      monthly: 'default'
    } as const;
    
    return <Badge variant={variants[plan]}>{plan}</Badge>;
  };

  const getDocumentStatus = (rider: Rider) => {
    const documents = {
      license: rider.license_document,
      aadhar: rider.aadhar_document,
      agreement: rider.agreement_document
    };
    
    const total = Object.values(documents).length;
    const completed = Object.values(documents).filter(Boolean).length;
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{completed}/{total}</span>
        {completed === total ? (
          <Badge variant="default" className="text-xs">Complete</Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">Pending</Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading riders...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rider Management</CardTitle>
        <CardDescription>
          Manage {riders.length} gig workers and their rental agreements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or rider ID..."
              value={fuzzySearchTerm}
              onChange={(e) => setFuzzySearchTerm(e.target.value)}
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddRiderOpen} onOpenChange={setIsAddRiderOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Rider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Rider</DialogTitle>
                <DialogDescription>
                  Complete rider registration with comprehensive information across all sections.
                </DialogDescription>
              </DialogHeader>
              <AddRiderForm
                onSubmit={onSubmit}
                onCancel={() => setIsAddRiderOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Riders Table */}
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider ID</TableHead>
              <TableHead>Rider details</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Rider Status</TableHead>
              <TableHead>Duty Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRiders.map((rider) => (
              <TableRow
                key={rider.id}
                className="cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => navigate(`/riders/${rider.id}`)}
              >
                <TableCell>
                  <div className="font-medium text-sm">
                    {rider.rider_id}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {rider.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(rider.phone || rider.mobile_number)?.slice(-10)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{rider.joined_since ? format(new Date(rider.joined_since), 'dd MMM yyyy') : 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(rider.status)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={rider.duty_status === 'LIVE' ? undefined : undefined}
                    className={rider.duty_status === 'LIVE' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}
                  >
                    {rider.duty_status || 'IDLE'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRider(rider);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRiderDetails(rider);
                      }}
                    >
                      Edit Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStatus(rider);
                      }}
                    >
                      Edit Status
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>

        {/* View Rider Details Modal */}
        <Dialog open={isViewRiderOpen} onOpenChange={setIsViewRiderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rider Details - {selectedRider?.name}</DialogTitle>
              <DialogDescription>
                Complete information for rider {selectedRider?.rider_id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRider && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Rider ID:</strong> {selectedRider.rider_id}</div>
                    <div><strong>Name:</strong> {selectedRider.name}</div>
                    <div><strong>First Name:</strong> {selectedRider.first_name || 'N/A'}</div>
                    <div><strong>Last Name:</strong> {selectedRider.last_name || 'N/A'}</div>
                    <div><strong>Phone:</strong> {selectedRider.phone}</div>
                    <div><strong>Mobile:</strong> {selectedRider.mobile_number || 'N/A'}</div>
                    <div><strong>Email:</strong> {selectedRider.email}</div>
                    <div><strong>Date of Birth:</strong> {selectedRider.dob ? new Date(selectedRider.dob).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Aadhaar Number:</strong> {selectedRider.aadhaar_number || 'N/A'}</div>
                    <div><strong>PAN Number:</strong> {selectedRider.pan_number || 'N/A'}</div>
                    <div><strong>Marital Status:</strong> {selectedRider.marital_status || 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Address Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Address Line 1:</strong> {selectedRider.address_line1 || 'N/A'}</div>
                    <div><strong>Address Line 2:</strong> {selectedRider.address_line2 || 'N/A'}</div>
                    <div><strong>City:</strong> {selectedRider.city || 'N/A'}</div>
                    <div><strong>State:</strong> {selectedRider.state || 'N/A'}</div>
                    <div><strong>Pincode:</strong> {selectedRider.pincode || 'N/A'}</div>
                    <div><strong>Full Address:</strong> {selectedRider.address}</div>
                    <div><strong>Google Link:</strong> {selectedRider.address_google_link ? 
                      <a href={selectedRider.address_google_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Location
                      </a> : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                {/* Banking Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Banking Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Bank Name:</strong> {selectedRider.bank_name || 'N/A'}</div>
                    <div><strong>Branch Name:</strong> {selectedRider.branch_name || 'N/A'}</div>
                    <div><strong>IFSC Code:</strong> {selectedRider.ifsc_code || 'N/A'}</div>
                    <div><strong>Account Number:</strong> {selectedRider.account_number || 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Employment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Aggregator:</strong> {selectedRider.aggregator || 'N/A'}</div>
                    <div><strong>Aggregator Other:</strong> {selectedRider.aggregator_other || 'N/A'}</div>
                    <div><strong>Aggregator ID:</strong> {selectedRider.aggregator_id || 'N/A'}</div>
                    <div><strong>Joined Since:</strong> {selectedRider.joined_since ? new Date(selectedRider.joined_since).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Avg Earnings (15 days):</strong> {selectedRider.avg_earnings_15_days ? `₹${selectedRider.avg_earnings_15_days}` : 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Status & Rental Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status & Rental</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Status:</strong> {getStatusBadge(selectedRider.status)}</div>
                    <div><strong>Duty Status:</strong> <Badge variant={selectedRider.duty_status === 'LIVE' ? undefined : undefined} className={selectedRider.duty_status === 'LIVE' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}>{selectedRider.duty_status || 'IDLE'}</Badge></div>
                    <div><strong>Rental Plan:</strong> {getPlanBadge(selectedRider.rental_plan)}</div>
                    <div><strong>Join Date:</strong> {new Date(selectedRider.join_date).toLocaleDateString()}</div>
                    <div><strong>Last Payment Date:</strong> {selectedRider.last_payment_date ? new Date(selectedRider.last_payment_date).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Vehicle Assigned:</strong> {selectedRider.vehicle_assigned || 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>License Document:</strong> <Badge variant={selectedRider.license_document ? 'default' : 'destructive'}>{selectedRider.license_document ? 'Received' : 'Pending'}</Badge></div>
                    <div><strong>Aadhaar Document:</strong> <Badge variant={selectedRider.aadhar_document ? 'default' : 'destructive'}>{selectedRider.aadhar_document ? 'Received' : 'Pending'}</Badge></div>
                    <div><strong>Agreement Document:</strong> <Badge variant={selectedRider.agreement_document ? 'default' : 'destructive'}>{selectedRider.agreement_document ? 'Received' : 'Pending'}</Badge></div>
                  </CardContent>
                </Card>

                {/* Family Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Family Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Dependent Name:</strong> {selectedRider.dependent_name || 'N/A'}</div>
                    <div><strong>Dependent Relation:</strong> {selectedRider.dependent_relation || 'N/A'}</div>
                    <div><strong>Dependent Aadhaar:</strong> {selectedRider.dependent_aadhaar || 'N/A'}</div>
                  </CardContent>
                </Card>

                {/* Office Use */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Office Use</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div><strong>Onboarded By:</strong> {selectedRider.onboarded_by || 'N/A'}</div>
                    <div><strong>Aggregator Credentials Checked:</strong> <Badge variant={selectedRider.aggregator_credentials_checked ? 'default' : 'destructive'}>{selectedRider.aggregator_credentials_checked ? 'Yes' : 'No'}</Badge></div>
                    <div><strong>ID Credentials Checked:</strong> <Badge variant={selectedRider.id_credentials_checked ? 'default' : 'destructive'}>{selectedRider.id_credentials_checked ? 'Yes' : 'No'}</Badge></div>
                    <div><strong>Retained Document Details:</strong> {selectedRider.retained_document_details || 'N/A'}</div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewRiderOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Status Modal */}
        <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Rider Status</DialogTitle>
              <DialogDescription>
                Update the rider and duty status for {editingRider?.name}
              </DialogDescription>
            </DialogHeader>
            
            {editingRider && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rider-status">Rider Status</Label>
                  <Select
                    defaultValue={editingRider.status}
                    onValueChange={(value) => {
                      const dutyStatus = editingRider.duty_status || 'IDLE';
                      handleStatusUpdate(value as Rider['status'], dutyStatus);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rider status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="deboarded">Deboarded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duty-status">Duty Status</Label>
                  <Select
                    defaultValue={editingRider.duty_status || 'IDLE'}
                    onValueChange={(value) => {
                      handleStatusUpdate(editingRider.status, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duty status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIVE">LIVE</SelectItem>
                      <SelectItem value="IDLE">IDLE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditStatusOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Rider Details Modal */}
        <Dialog open={isEditDetailsOpen} onOpenChange={setIsEditDetailsOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Rider Details - {editingRider?.name}</DialogTitle>
              <DialogDescription>
                Update the rider's information
              </DialogDescription>
            </DialogHeader>
            
            {editingRider && (
              <div className="mt-4">
                <AddRiderForm 
                  onSubmit={(updatedData) => {
                    updateRider(editingRider.id, updatedData);
                    setIsEditDetailsOpen(false);
                    setEditingRider(null);
                  }}
                  onCancel={() => {
                    setIsEditDetailsOpen(false);
                    setEditingRider(null);
                  }}
                  initialData={editingRider}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rider Activation Modal - Enforces Vehicle + Battery Smart ID selection */}
        <RiderActivationModal
          open={isActivationModalOpen}
          onOpenChange={setIsActivationModalOpen}
          rider={editingRider}
          vehicles={vehicles}
          onConfirm={handleRiderActivation}
          isLoading={isActivationLoading}
        />

        {/* Rental Ledger Confirmation Modal - Shown after rider activation */}
        <RentalLedgerConfirmModal
          open={isRentalConfirmModalOpen}
          onOpenChange={setIsRentalConfirmModalOpen}
          ledgerId={newLedgerId}
          riderName={activatedRiderInfo?.name || ''}
          vehicleNumber={activatedRiderInfo?.vehicleNumber}
          riderId={activatedRiderInfo?.riderId}
          onSuccess={handleRentalConfirmSuccess}
        />
      </CardContent>
    </Card>
  );
};