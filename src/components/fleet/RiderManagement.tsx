import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Phone, Mail, Calendar, User } from "lucide-react";

interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicleAssigned?: string;
  rentalPlan: 'daily' | 'weekly' | 'monthly';
  joinDate: string;
  lastPaymentDate?: string;
  documents: {
    license: boolean;
    aadhar: boolean;
    agreement: boolean;
  };
  address: string;
}

export const RiderManagement = () => {
  const [riders, setRiders] = useState<Rider[]>([
    {
      id: "R001",
      name: "Arjun Kumar",
      phone: "+91 98765 43210",
      email: "arjun.kumar@email.com",
      status: "active",
      vehicleAssigned: "EV001",
      rentalPlan: "monthly",
      joinDate: "2023-12-01",
      lastPaymentDate: "2024-01-01",
      documents: { license: true, aadhar: true, agreement: true },
      address: "123 Main Street, Bangalore"
    },
    {
      id: "R002",
      name: "Priya Singh",
      phone: "+91 87654 32109",
      email: "priya.singh@email.com",
      status: "active",
      vehicleAssigned: "EV015",
      rentalPlan: "weekly",
      joinDate: "2024-01-10",
      lastPaymentDate: "2024-01-15",
      documents: { license: true, aadhar: true, agreement: false },
      address: "456 Park Avenue, Bangalore"
    },
    {
      id: "R003",
      name: "Rajesh Patel",
      phone: "+91 76543 21098",
      email: "rajesh.patel@email.com",
      status: "inactive",
      rentalPlan: "daily",
      joinDate: "2023-11-15",
      documents: { license: true, aadhar: false, agreement: true },
      address: "789 Garden Road, Bangalore"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddRiderOpen, setIsAddRiderOpen] = useState(false);

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.phone.includes(searchTerm) ||
                         rider.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || rider.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Rider['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getPlanBadge = (plan: Rider['rentalPlan']) => {
    const variants = {
      daily: 'outline',
      weekly: 'secondary',
      monthly: 'default'
    } as const;
    
    return <Badge variant={variants[plan]}>{plan}</Badge>;
  };

  const getDocumentStatus = (documents: Rider['documents']) => {
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Rider</DialogTitle>
                <DialogDescription>
                  Register a new gig worker to your platform.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="riderName">Full Name</Label>
                    <Input id="riderName" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="riderPhone">Phone Number</Label>
                    <Input id="riderPhone" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="riderEmail">Email Address</Label>
                  <Input id="riderEmail" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="riderAddress">Address</Label>
                  <Textarea id="riderAddress" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rentalPlan">Rental Plan</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input id="joinDate" type="date" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Rider</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Riders Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rider Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRiders.map((rider) => (
              <TableRow key={rider.id}>
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {rider.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{rider.id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="h-3 w-3" />
                      {rider.phone}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3" />
                      {rider.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(rider.status)}</TableCell>
                <TableCell>
                  {rider.vehicleAssigned ? (
                    <Badge variant="outline">{rider.vehicleAssigned}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>{getPlanBadge(rider.rentalPlan)}</TableCell>
                <TableCell>{getDocumentStatus(rider.documents)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(rider.joinDate).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit
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