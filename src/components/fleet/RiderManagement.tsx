import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Plus, Search, Filter, Phone, Mail, Calendar, User } from "lucide-react";
import { useRiders, type Rider } from "@/hooks/useRiders";

interface RiderFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  rental_plan: 'daily' | 'weekly' | 'monthly';
  join_date: string;
}

export const RiderManagement = () => {
  const { riders, loading, addRider } = useRiders();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddRiderOpen, setIsAddRiderOpen] = useState(false);

  const form = useForm<RiderFormData>();

  const onSubmit = async (data: RiderFormData) => {
    try {
      await addRider(data);
      setIsAddRiderOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding rider:', error);
    }
  };

  const filteredRiders = riders.filter(rider => {
    const matchesSearch = rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rider.phone.includes(searchTerm) ||
                         rider.rider_id.toLowerCase().includes(searchTerm.toLowerCase());
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: "Full name is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      rules={{ 
                        required: "Phone number is required",
                        pattern: { value: /^\+?[\d\s-()]+$/, message: "Invalid phone number" }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ 
                      required: "Email is required",
                      pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email address" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    rules={{ required: "Address is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rental_plan"
                      rules={{ required: "Rental plan is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rental Plan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="join_date"
                      rules={{ required: "Join date is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Join Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddRiderOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Rider</Button>
                  </DialogFooter>
                </form>
              </Form>
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
                    <div className="text-sm text-muted-foreground">{rider.rider_id}</div>
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
                  {rider.vehicle_assigned ? (
                    <Badge variant="outline">{rider.vehicle_assigned}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>{getPlanBadge(rider.rental_plan)}</TableCell>
                <TableCell>{getDocumentStatus(rider)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(rider.join_date).toLocaleDateString()}</span>
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