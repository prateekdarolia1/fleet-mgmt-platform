import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InventoryManagement } from "@/components/fleet/InventoryManagement";
import { RiderManagement } from "@/components/fleet/RiderManagement";
import { PaymentTracking } from "@/components/fleet/PaymentTracking";
import { Bike, Users, CreditCard, Activity } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  // Mock data for dashboard overview
  const overviewStats = {
    totalVehicles: 100,
    activeRentals: 67,
    availableVehicles: 33,
    totalRiders: 245,
    activeRiders: 67,
    monthlyRevenue: 125000,
    pendingPayments: 15
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
              <p className="text-muted-foreground">EV Rental Business Dashboard</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Single City</Badge>
              <Badge variant="outline">B2B Focused</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Bike className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">
                {overviewStats.availableVehicles} available
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.activeRentals}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((overviewStats.activeRentals / overviewStats.totalVehicles) * 100)}% utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Riders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalRiders}</div>
              <p className="text-xs text-muted-foreground">
                {overviewStats.activeRiders} currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{overviewStats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {overviewStats.pendingPayments} pending payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
            <TabsTrigger value="riders">Rider Management</TabsTrigger>
            <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="space-y-4">
            <InventoryManagement />
          </TabsContent>
          
          <TabsContent value="riders" className="space-y-4">
            <RiderManagement />
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-4">
            <PaymentTracking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
