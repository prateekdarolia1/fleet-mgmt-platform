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
import { toast } from "sonner";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  make: string;
  model: string;
  color: string;
  chassisNumber: string;
  motorSerialNumber: string;
  deliveryDate: string;
  vendor: string;
  pdiDoneBy: string;
  registrationReceived: string;
  insuranceReceived: string;
  portableChargerReceived: string;
  vehicleType: string;
  batteryType: string;
  status: 'Ready for Deployment' | 'Deployed' | 'Under Maintenance';
  riderId?: string;
  riderName?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  nextMaintenanceDate: string;
  location?: string;
}

interface VehicleFormData {
  make: string;
  model: string;
  color: string;
  chassisNumber: string;
  motorSerialNumber: string;
  deliveryDate: string;
  vendor: string;
  pdiDoneBy: string;
  registrationReceived: string;
  insuranceReceived: string;
  portableChargerReceived: string;
  vehicleType: string;
  batteryType: string;
}

export const InventoryManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "LP-01-0001",
      vehicleNumber: "LP-01-0001",
      make: "EBlu",
      model: "Feo",
      color: "Black",
      chassisNumber: "CH001ABC123",
      motorSerialNumber: "MS001XYZ456",
      deliveryDate: "2024-01-10",
      vendor: "Global Transatlantic",
      pdiDoneBy: "Shubham",
      registrationReceived: "Yes",
      insuranceReceived: "Yes",
      portableChargerReceived: "Yes",
      vehicleType: "High Speed",
      batteryType: "Fixed",
      status: "Deployed",
      riderId: "R001",
      riderName: "Arjun Kumar",
      rentalStartDate: "2024-01-15",
      rentalEndDate: "2024-02-14",
      nextMaintenanceDate: "2024-02-20",
      location: "Zone A"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [pendingVehicleData, setPendingVehicleData] = useState<VehicleFormData | null>(null);

  const form = useForm<VehicleFormData>();
  const editForm = useForm<VehicleFormData>();

  const generateVehicleId = () => {
    const existingNumbers = vehicles
      .map(v => v.vehicleNumber)
      .filter(num => num.startsWith("LP-01-"))
      .map(num => parseInt(num.split("-")[2]))
      .filter(num => !isNaN(num));
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `LP-01-${nextNumber.toString().padStart(4, '0')}`;
  };

  const onSubmit = (data: VehicleFormData) => {
    setPendingVehicleData(data);
    setShowConfirmation(true);
  };

  const confirmAddVehicle = () => {
    if (!pendingVehicleData) return;

    const vehicleId = generateVehicleId();
    const newVehicle: Vehicle = {
      id: vehicleId,
      vehicleNumber: vehicleId,
      ...pendingVehicleData,
      status: 'Ready for Deployment',
      nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
    };

    setVehicles(prev => [...prev, newVehicle]);
    setIsAddVehicleOpen(false);
    setShowConfirmation(false);
    setPendingVehicleData(null);
    form.reset();
    toast.success(`Vehicle ${vehicleId} added successfully!`);
  };

  const toggleVehicleStatus = (vehicleId: string) => {
    setVehicles(prev => prev.map(vehicle => {
      if (vehicle.id === vehicleId) {
        const statusOrder: Vehicle['status'][] = ['Ready for Deployment', 'Deployed', 'Under Maintenance'];
        const currentIndex = statusOrder.indexOf(vehicle.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const newStatus = statusOrder[nextIndex];
        
        toast.success(`Vehicle ${vehicleId} status changed to ${newStatus}`);
        return { ...vehicle, status: newStatus };
      }
      return vehicle;
    }));
  };

  const startEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    editForm.reset({
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      chassisNumber: vehicle.chassisNumber,
      motorSerialNumber: vehicle.motorSerialNumber,
      deliveryDate: vehicle.deliveryDate,
      vendor: vehicle.vendor,
      pdiDoneBy: vehicle.pdiDoneBy,
      registrationReceived: vehicle.registrationReceived,
      insuranceReceived: vehicle.insuranceReceived,
      portableChargerReceived: vehicle.portableChargerReceived,
      vehicleType: vehicle.vehicleType,
      batteryType: vehicle.batteryType,
    });
    setIsEditVehicleOpen(true);
  };

  const onEditSubmit = (data: VehicleFormData) => {
    if (!editingVehicle) return;

    setVehicles(prev => prev.map(vehicle => {
      if (vehicle.id === editingVehicle.id) {
        return { ...vehicle, ...data };
      }
      return vehicle;
    }));

    setIsEditVehicleOpen(false);
    setEditingVehicle(null);
    editForm.reset();
    toast.success(`Vehicle ${editingVehicle.vehicleNumber} updated successfully!`);
  };

  const confirmRemoveVehicle = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteConfirmation(true);
  };

  const removeVehicle = () => {
    if (!vehicleToDelete) return;

    setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleToDelete.id));
    setShowDeleteConfirmation(false);
    setVehicleToDelete(null);
    toast.success(`Vehicle ${vehicleToDelete.vehicleNumber} removed successfully!`);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.riderName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Vehicle['status']) => {
    if (status === 'Deployed') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
    }
    
    const variants = {
      'Ready for Deployment': 'default',
      'Under Maintenance': 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

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
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-green-50 p-4 rounded-lg">
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
                      name="deliveryDate"
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
                      name="chassisNumber"
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
                      name="motorSerialNumber"
                      rules={{ 
                        required: "Motor serial number is required",
                        maxLength: { value: 20, message: "Maximum 20 characters allowed" },
                        pattern: { value: /^[a-zA-Z0-9]*$/, message: "Only alphanumeric characters allowed" }
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
                      name="pdiDoneBy"
                      rules={{ required: "PDI done by is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PDI Done by</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select inspector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Shubham">Shubham</SelectItem>
                              <SelectItem value="Vaibhav">Vaibhav</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="registrationReceived"
                      rules={{ required: "Registration status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Received?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insuranceReceived"
                      rules={{ required: "Insurance status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Received?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="portableChargerReceived"
                      rules={{ required: "Portable charger status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portable Charger Received?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
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
                      name="vehicleType"
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
                      name="batteryType"
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
                              <SelectItem value="Removable">Removable</SelectItem>
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

          {/* Edit Vehicle Dialog */}
          <Dialog open={isEditVehicleOpen} onOpenChange={setIsEditVehicleOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Vehicle</DialogTitle>
                <DialogDescription>
                  Update vehicle details for {editingVehicle?.vehicleNumber}.
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
                      name="deliveryDate"
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
                      name="chassisNumber"
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
                      name="motorSerialNumber"
                      rules={{ 
                        required: "Motor serial number is required",
                        maxLength: { value: 20, message: "Maximum 20 characters allowed" },
                        pattern: { value: /^[a-zA-Z0-9]*$/, message: "Only alphanumeric characters allowed" }
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
                      name="pdiDoneBy"
                      rules={{ required: "PDI done by is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PDI Done by</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select inspector" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Shubham">Shubham</SelectItem>
                              <SelectItem value="Vaibhav">Vaibhav</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={editForm.control}
                      name="registrationReceived"
                      rules={{ required: "Registration status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="insuranceReceived"
                      rules={{ required: "Insurance status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="portableChargerReceived"
                      rules={{ required: "Portable charger status is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Portable Charger Received?</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="NA">N/A</SelectItem>
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
                      name="vehicleType"
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
                      name="batteryType"
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
                              <SelectItem value="Removable">Removable</SelectItem>
                              <SelectItem value="Swappable">Swappable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsEditVehicleOpen(false);
                      setEditingVehicle(null);
                      editForm.reset();
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Vehicle</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Vehicle Addition</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to add this vehicle to your fleet? The vehicle will be assigned ID: <strong>{generateVehicleId()}</strong> and marked as "Ready for Deployment".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowConfirmation(false);
                setPendingVehicleData(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmAddVehicle}>
                Confirm & Add Vehicle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Vehicle</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove vehicle <strong>{vehicleToDelete?.vehicleNumber}</strong> from your fleet? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteConfirmation(false);
                setVehicleToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={removeVehicle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove Vehicle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Vehicles Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle ID</TableHead>
              <TableHead>Make & Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Rider</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Battery Type</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                    <div className="text-sm text-muted-foreground">{vehicle.color}</div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                <TableCell>
                  {vehicle.riderName ? (
                    <div>
                      <div className="font-medium">{vehicle.riderName}</div>
                      <div className="text-sm text-muted-foreground">{vehicle.riderId}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{new Date(vehicle.deliveryDate).toLocaleDateString()}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{vehicle.vehicleType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{vehicle.batteryType}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleVehicleStatus(vehicle.id)}
                      title="Toggle Status"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Status
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startEditVehicle(vehicle)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => confirmRemoveVehicle(vehicle)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};