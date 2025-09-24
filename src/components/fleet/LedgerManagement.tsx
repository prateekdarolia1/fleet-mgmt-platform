import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, User, DollarSign } from "lucide-react";
import { useRiderLedgers } from "@/hooks/useRiderLedgers";
import { CreateLedgerForm } from "./CreateLedgerForm";

export const LedgerManagement = () => {
  const { ledgers, loading } = useRiderLedgers();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredLedgers = ledgers.filter(ledger => 
    ledger.rider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ledger.rider_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFrequencyBadge = (frequency: string) => {
    const variants = {
      daily: "default" as const,
      weekly: "secondary" as const,
      monthly: "outline" as const
    };
    return <Badge variant={variants[frequency as keyof typeof variants]}>{frequency.charAt(0).toUpperCase() + frequency.slice(1)}</Badge>;
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
                  <TableHead>Security Deposit</TableHead>
                  <TableHead>Rental Details</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedgers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No ledgers found matching your search." : "No ledgers created yet. Create your first ledger to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedgers.map((ledger) => (
                    <TableRow key={ledger.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ledger.rider_name}</div>
                          <div className="text-sm text-muted-foreground">{ledger.rider_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          ₹{Number(ledger.security_deposit_amount).toLocaleString()}
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
                        <div className="text-sm text-muted-foreground">
                          {new Date(ledger.created_at).toLocaleDateString()}
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
    </div>
  );
};