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
import { AddRiderForm } from "./AddRiderForm";

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
              <TableHead>Rider Name + Mobile</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Rider Status</TableHead>
              <TableHead>Duty Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRiders.map((rider) => (
              <TableRow key={rider.id}>
                <TableCell>
                  <div className="font-medium text-sm">
                    {rider.rider_id}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {rider.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rider.phone || rider.mobile_number}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(rider.join_date).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(rider.status)}</TableCell>
                <TableCell>
                  <Badge variant={rider.duty_status === 'LIVE' ? 'default' : 'secondary'}>
                    {rider.duty_status || 'IDLE'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};