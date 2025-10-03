import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, Filter, Calendar, Wrench, Edit, Trash2, RotateCcw } from "lucide-react";
import { useVehicles, type Vehicle } from "@/hooks/useVehicles";
import { useAvailableRiders } from "@/hooks/useAvailableRiders";
import { toast } from "sonner";

interface VehicleFormData {
  make: string;
  model: string;
  color: string;
  chassis_number: string;
  motor_serial_number: string;
  delivery_date: string;
  vendor: string;
  pdi_done_by: string;
  registration_received: boolean | string;
  insurance_received: boolean | string;
  portable_charger_received: boolean | string;
  vehicle_type: 'High Speed' | 'Low Speed';
  battery_type: 'Fixed' | 'Swappable';
  vehicle_number: string;
}

export const InventoryManagement = () => {
  const { vehicles, loading, addVehicle, updateVehicle, deleteVehicle, toggleVehicleStatus } = useVehicles();
  const { riders: availableRiders, loading: ridersLoading } = useAvailableRiders();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [pendingVehicleData, setPendingVehicleData] = useState<VehicleFormData | null>(null);
  const [statusChangeVehicle, setStatusChangeVehicle] = useState<Vehicle | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedRider, setSelectedRider] = useState<string>("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const form = useForm<VehicleFormData>();
  const editForm = useForm<VehicleFormData>();

  const onSubmit = async (data: VehicleFormData) => {
    // Convert form data to match Vehicle interface
    const vehicleData = {
      ...data,
      registration_received: data.registration_received === 'na' ? false : data.registration_received === 'true',
      insurance_received: data.insurance_received === 'na' ? false : data.insurance_received === 'true',
      portable_charger_received: data.portable_charger_received === 'na' ? false : data.portable_charger_received === 'true'
    };
    setPendingVehicleData(vehicleData);
    setShowConfirmation(true);
  };

  const confirmAddVehicle = async () => {
    if (!pendingVehicleData) return;

    try {
      // Convert string values to boolean for backend
      const vehicleData = {
        ...pendingVehicleData,
        registration_received: pendingVehicleData.registration_received === true,
        insurance_received: pendingVehicleData.insurance_received === true,
        portable_charger_received: pendingVehicleData.portable_charger_received === true
      };
      await addVehicle(vehicleData);
      setIsAddVehicleOpen(false);
      setShowConfirmation(false);
      setPendingVehicleData(null);
      form.reset();
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      setShowConfirmation(false);
      
      // Handle specific database constraint errors
      if (error?.code === '23505') {
        const details = error.details || '';
        let errorMessage = 'This vehicle already exists in the system.';
        
        if (details.includes('chassis_number')) {
          errorMessage = 'A vehicle with this chassis number already exists. Please check the chassis number and try again.';
          form.setError('chassis_number', { 
            type: 'manual', 
            message: 'This chassis number is already registered' 
          });
        } else if (details.includes('vehicle_number')) {
          errorMessage = 'A vehicle with this registration number already exists. Please check the vehicle number and try again.';
          form.setError('vehicle_number', { 
            type: 'manual', 
            message: 'This vehicle number is already registered' 
          });
        } else if (details.includes('motor_serial_number')) {
          errorMessage = 'A vehicle with this motor serial number already exists. Please check the motor serial number and try again.';
          form.setError('motor_serial_number', { 
            type: 'manual', 
            message: 'This motor serial number is already registered' 
          });
        }
        
        // You can add a toast notification here if you have one available
        alert(errorMessage);
      } else {
        alert('Failed to add vehicle. Please try again.');
      }
    }
  };

  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    editForm.reset({
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      chassis_number: vehicle.chassis_number,
      motor_serial_number: vehicle.motor_serial_number,
      delivery_date: vehicle.delivery_date,
      vendor: vehicle.vendor,
      pdi_done_by: vehicle.pdi_done_by,
      registration_received: vehicle.registration_received ? 'true' : 'false',
      insurance_received: vehicle.insurance_received ? 'true' : 'false',
      portable_charger_received: vehicle.portable_charger_received ? 'true' : 'false',
      vehicle_type: vehicle.vehicle_type,
      battery_type: vehicle.battery_type,
      vehicle_number: vehicle.vehicle_number,
    });
    setIsEditVehicleOpen(true);
  };

  const onEditSubmit = async (data: VehicleFormData) => {
    if (!editingVehicle) return;

    try {
      // Convert form data to match Vehicle interface
      const vehicleData = {
        ...data,
        registration_received: data.registration_received === 'na' ? false : data.registration_received === 'true',
        insurance_received: data.insurance_received === 'na' ? false : data.insurance_received === 'true',
        portable_charger_received: data.portable_charger_received === 'na' ? false : data.portable_charger_received === 'true'
      };
      await updateVehicle(editingVehicle.id, vehicleData);
      setIsEditVehicleOpen(false);
      setEditingVehicle(null);
      editForm.reset();
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      
      // Handle specific database constraint errors
      if (error?.code === '23505') {
        const details = error.details || '';
        let errorMessage = 'This vehicle information conflicts with an existing vehicle.';
        
        if (details.includes('chassis_number')) {
          errorMessage = 'A vehicle with this chassis number already exists. Please check the chassis number and try again.';
          editForm.setError('chassis_number', { 
            type: 'manual', 
            message: 'This chassis number is already registered' 
          });
        } else if (details.includes('vehicle_number')) {
          errorMessage = 'A vehicle with this registration number already exists. Please check the vehicle number and try again.';
          editForm.setError('vehicle_number', { 
            type: 'manual', 
            message: 'This vehicle number is already registered' 
          });
        } else if (details.includes('motor_serial_number')) {
          errorMessage = 'A vehicle with this motor serial number already exists. Please check the motor serial number and try again.';
          editForm.setError('motor_serial_number', { 
            type: 'manual', 
            message: 'This motor serial number is already registered' 
          });
        }
        
        alert(errorMessage);
      } else {
        alert('Failed to update vehicle. Please try again.');
      }
    }
  };

  const handleStatusChange = (vehicle: Vehicle) => {
    setStatusChangeVehicle(vehicle);
    setSelectedStatus(vehicle.status);
    setSelectedRider("");
    setShowStatusDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!statusChangeVehicle || !selectedStatus) return;

    if (selectedStatus === 'Deployed' && !selectedRider) {
      toast.error('Please select a rider for deployed status');
      return;
    }

    try {
      const updates: any = { status: selectedStatus };
      
      if (selectedStatus === 'Deployed' && selectedRider) {
        const rider = availableRiders.find(r => r.id === selectedRider);
        updates.rider_id = rider?.rider_id;
        updates.rider_name = rider?.name;
      } else if (selectedStatus !== 'Deployed') {
        updates.rider_id = null;
        updates.rider_name = null;
      }

      await updateVehicle(statusChangeVehicle.id, updates);
      setShowStatusDialog(false);
      setStatusChangeVehicle(null);
      setSelectedStatus("");
      setSelectedRider("");
      toast.success('Vehicle status updated successfully');
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast.error('Failed to update vehicle status');
    }
  };

  const confirmRemoveVehicle = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteConfirmation(true);
  };

  const removeVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      await deleteVehicle(vehicleToDelete.id);
      setShowDeleteConfirmation(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.rider_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Vehicle['status']) => {
    if (status === 'Deployed') {
      return <Badge variant="success">{status}</Badge>;
    }
    
    if (status === 'Ready for Deployment') {
      return <Badge variant="warning">{status}</Badge>;
    }
    
    const variants = {
      'Under Maintenance': 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading vehicles...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Inventory</CardTitle>
        <CardDescription>
          Manage your fleet of {vehicles.length} vehicles across different zones
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-accent/50 p-4 rounded-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by vehicle number, model, or rider name..."
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
              <SelectItem value="Ready for Deployment">Ready for Deployment</SelectItem>
              <SelectItem value="Deployed">Deployed</SelectItem>
              <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Register a new vehicle in your fleet inventory. All fields are required.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="make"
                      rules={{ required: "Vehicle make is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Make</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select make" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EBlu">EBlu</SelectItem>
                              <SelectItem value="Evolet">Evolet</SelectItem>
                              <SelectItem value="IntuitEV">IntuitEV</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      rules={{ required: "Vehicle model is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Model</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Feo">Feo</SelectItem>
                              <SelectItem value="Polo">Polo</SelectItem>
                              <SelectItem value="BanaEV">BanaEV</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="color"
                      rules={{ required: "Color is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Black">Black</SelectItem>
                              <SelectItem value="White">White</SelectItem>
                              <SelectItem value="Red">Red</SelectItem>
                              <SelectItem value="Maroon">Maroon</SelectItem>
                              <SelectItem value="Blue">Blue</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="delivery_date"
                      rules={{ required: "Delivery date is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_number"
                      rules={{ 
                        required: "Vehicle Registration Number is required",
                        maxLength: {
                          value: 12,
                          message: "Maximum 12 characters allowed"
                        },
                        pattern: {
                          value: /^[A-Z0-9]*$/,
                          message: "Only uppercase letters and numbers allowed"
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Registration Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., MH12AB1234" 
                              maxLength={12}
                              {...field} 
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chassis_number"
                      rules={{ 
                        required: "Chassis number is required",
                        maxLength: { value: 20, message: "Maximum 20 characters allowed" },
                        pattern: { value: /^[a-zA-Z0-9]*$/, message: "Only alphanumeric characters allowed" }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chassis Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter chassis number" maxLength={20} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="motor_serial_number"
                      rules={{ 
                        required: "Motor serial number is required",
                        maxLength: { value: 20, message: "Maximum 20 characters allowed" }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motor Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter motor serial number" maxLength={20} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendor"
                      rules={{ required: "Vendor is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Global Transatlantic">Global Transatlantic</SelectItem>
                              <SelectItem value="Risalla EV">Risalla EV</SelectItem>
                              <SelectItem value="IntuitEV">IntuitEV</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pdi_done_by"
                      rules={{ required: "PDI done by is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PDI Done By</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select name" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Vaibhav">Vaibhav</SelectItem>
                                <SelectItem value="Shubham">Shubham</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="NA">NA</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="registration_received"
                      rules={{ required: "Registration status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="na">NA</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insurance_received"
                      rules={{ required: "Insurance status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="na">NA</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="portable_charger_received"
                      rules={{ required: "Portable charger status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portable Charger Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                              <SelectItem value="na">NA</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_type"
                      rules={{ required: "Vehicle type is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="High Speed">High Speed</SelectItem>
                              <SelectItem value="Low Speed">Low Speed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="battery_type"
                      rules={{ required: "Battery type is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select battery type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Fixed">Fixed</SelectItem>
                              <SelectItem value="Swappable">Swappable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Vehicle</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
              <DialogDescription>
                Update vehicle information in your fleet inventory.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="make"
                    rules={{ required: "Vehicle make is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Make</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select make" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EBlu">EBlu</SelectItem>
                            <SelectItem value="Evolet">Evolet</SelectItem>
                            <SelectItem value="IntuitEV">IntuitEV</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="model"
                    rules={{ required: "Vehicle model is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Model</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Feo">Feo</SelectItem>
                            <SelectItem value="Polo">Polo</SelectItem>
                            <SelectItem value="BanaEV">BanaEV</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="color"
                    rules={{ required: "Color is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Black">Black</SelectItem>
                            <SelectItem value="White">White</SelectItem>
                            <SelectItem value="Red">Red</SelectItem>
                            <SelectItem value="Maroon">Maroon</SelectItem>
                            <SelectItem value="Blue">Blue</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="delivery_date"
                    rules={{ required: "Delivery date is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="vehicle_number"
                    rules={{ 
                      required: "Vehicle Registration Number is required",
                      maxLength: {
                        value: 12,
                        message: "Maximum 12 characters allowed"
                      },
                      pattern: {
                        value: /^[A-Z0-9]*$/,
                        message: "Only uppercase letters and numbers allowed"
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Registration Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., MH12AB1234" 
                            maxLength={12}
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="chassis_number"
                    rules={{ 
                      required: "Chassis number is required",
                      maxLength: { value: 20, message: "Maximum 20 characters allowed" },
                      pattern: { value: /^[a-zA-Z0-9]*$/, message: "Only alphanumeric characters allowed" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chassis Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter chassis number" maxLength={20} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="motor_serial_number"
                    rules={{ 
                      required: "Motor serial number is required",
                      maxLength: { value: 20, message: "Maximum 20 characters allowed" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motor Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter motor serial number" maxLength={20} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="vendor"
                    rules={{ required: "Vendor is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Global Transatlantic">Global Transatlantic</SelectItem>
                            <SelectItem value="Risalla EV">Risalla EV</SelectItem>
                            <SelectItem value="IntuitEV">IntuitEV</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="pdi_done_by"
                    rules={{ required: "PDI done by is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PDI Done By</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select name" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Vaibhav">Vaibhav</SelectItem>
                              <SelectItem value="Shubham">Shubham</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                              <SelectItem value="NA">NA</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="registration_received"
                    rules={{ required: "Registration status is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Received?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="na">NA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="insurance_received"
                    rules={{ required: "Insurance status is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Received?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="na">NA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="portable_charger_received"
                    rules={{ required: "Portable charger status is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portable Charger Received?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="na">NA</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="vehicle_type"
                    rules={{ required: "Vehicle type is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="High Speed">High Speed</SelectItem>
                            <SelectItem value="Low Speed">Low Speed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="battery_type"
                    rules={{ required: "Battery type is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Battery Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select battery type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Fixed">Fixed</SelectItem>
                            <SelectItem value="Swappable">Swappable</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditVehicleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Vehicle</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Vehicles Table */}
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle Details</TableHead>
              <TableHead>Technical Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rental Info</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{vehicle.vehicle_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model} ({vehicle.color})
                    </div>
                    <div className="text-xs text-muted-foreground">{vehicle.vendor}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">{vehicle.vehicle_type}</span>
                      <span className="text-muted-foreground"> • {vehicle.battery_type}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                <TableCell>
                  {vehicle.rider_name ? (
                    <div>
                      <div className="font-medium text-sm">{vehicle.rider_name}</div>
                      <div className="text-xs text-muted-foreground">{vehicle.rider_id}</div>
                      {vehicle.rental_start_date && (
                        <div className="text-xs text-muted-foreground">
                          Since: {new Date(vehicle.rental_start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStatusChange(vehicle)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Status
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEditVehicle(vehicle)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => confirmRemoveVehicle(vehicle)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>

        {/* Add Vehicle Confirmation Dialog */}
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Vehicle Addition</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to add this vehicle to your fleet?
                {pendingVehicleData && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <div><strong>Make:</strong> {pendingVehicleData.make}</div>
                    <div><strong>Model:</strong> {pendingVehicleData.model}</div>
                    <div><strong>Color:</strong> {pendingVehicleData.color}</div>
                    <div><strong>Vendor:</strong> {pendingVehicleData.vendor}</div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAddVehicle}>
                Yes, Add Vehicle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Vehicle Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Vehicle Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this vehicle from your fleet? This action cannot be undone.
                {vehicleToDelete && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-md">
                    <div><strong>Vehicle:</strong> {vehicleToDelete.vehicle_number}</div>
                    <div><strong>Make/Model:</strong> {vehicleToDelete.make} {vehicleToDelete.model}</div>
                    <div><strong>Status:</strong> {vehicleToDelete.status}</div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={removeVehicle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Remove Vehicle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Status Change Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Vehicle Status</DialogTitle>
              <DialogDescription>
                Update the status of {statusChangeVehicle?.vehicle_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Ready for Deployment">Ready for Deployment</SelectItem>
                    <SelectItem value="Deployed">Deployed</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedStatus === 'Deployed' && (
                <div className="space-y-2">
                  <Label htmlFor="rider">Select Rider</Label>
                  <Select value={selectedRider} onValueChange={setSelectedRider}>
                    <SelectTrigger id="rider">
                      <SelectValue placeholder="Choose a rider" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {ridersLoading ? (
                        <SelectItem value="loading" disabled>Loading riders...</SelectItem>
                      ) : availableRiders.length === 0 ? (
                        <SelectItem value="none" disabled>No available riders</SelectItem>
                      ) : (
                        availableRiders.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {rider.name} ({rider.rider_id})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedStatus === 'Deployed' && availableRiders.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No riders with Active status and IDLE duty status available
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmStatusChange}>
                Update Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};