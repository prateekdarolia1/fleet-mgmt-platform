import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Calendar, Wrench } from "lucide-react";

interface Vehicle {
  id: string;
  vehicleNumber: string;
  model: string;
  status: 'available' | 'rented' | 'maintenance' | 'out-of-service';
  riderId?: string;
  riderName?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  nextMaintenanceDate: string;
  location: string;
}

export const InventoryManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "1",
      vehicleNumber: "EV001",
      model: "Ather 450X",
      status: "rented",
      riderId: "R001",
      riderName: "Arjun Kumar",
      rentalStartDate: "2024-01-15",
      rentalEndDate: "2024-02-14",
      nextMaintenanceDate: "2024-02-20",
      location: "Zone A"
    },
    {
      id: "2",
      vehicleNumber: "EV002",
      model: "TVS iQube",
      status: "available",
      nextMaintenanceDate: "2024-01-25",
      location: "Zone B"
    },
    {
      id: "3",
      vehicleNumber: "EV003",
      model: "Ola S1 Pro",
      status: "maintenance",
      nextMaintenanceDate: "2024-01-20",
      location: "Service Center"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.riderName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Vehicle['status']) => {
    const variants = {
      available: 'default',
      rented: 'secondary',
      maintenance: 'destructive',
      'out-of-service': 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status.replace('-', ' ')}</Badge>;
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out-of-service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Register a new vehicle in your fleet inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vehicleNumber" className="text-right">
                    Vehicle Number
                  </Label>
                  <Input id="vehicleNumber" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="model" className="text-right">
                    Model
                  </Label>
                  <Input id="model" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input id="location" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Vehicle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vehicles Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle Number</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Rider</TableHead>
              <TableHead>Rental Period</TableHead>
              <TableHead>Next Maintenance</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                <TableCell>{vehicle.model}</TableCell>
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
                  {vehicle.rentalStartDate && vehicle.rentalEndDate ? (
                    <div className="text-sm">
                      <div>{new Date(vehicle.rentalStartDate).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">to {new Date(vehicle.rentalEndDate).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(vehicle.nextMaintenanceDate).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>{vehicle.location}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Wrench className="h-3 w-3 mr-1" />
                      Service
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