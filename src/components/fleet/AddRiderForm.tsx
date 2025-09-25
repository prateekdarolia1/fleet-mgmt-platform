import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { usePlacesSearch } from "@/hooks/usePlacesSearch";

interface RiderFormData {
  // Section 1: Personal Information
  first_name: string;
  last_name: string;
  mobile_number: string;
  dob: string; // Changed to string for API compatibility
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
  joined_since: string; // Changed to string for API compatibility
  avg_earnings_15_days: number;
  
  // Section 4: Office Use
  onboarded_by: 'SHUBHAM' | 'VAIBHAV';
  aggregator_credentials_checked: boolean;
  id_credentials_checked: boolean;
  retained_document_details: string;
}

interface AddRiderFormProps {
  onSubmit: (data: RiderFormData) => void;
  onCancel: () => void;
  initialData?: any;
}

export const AddRiderForm = ({ onSubmit, onCancel, initialData }: AddRiderFormProps) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<RiderFormData | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<{pincode?: string, city?: string, state?: string}>({});
  
  const { 
    loading: placesLoading, 
    filteredStates, 
    filteredCities, 
    filterByPincode, 
    extractLocationSuggestions,
    getPincodeSuggestions 
  } = usePlacesSearch();

  const form = useForm<{
    // Use Date for form fields that are actual dates
    first_name: string;
    last_name: string;
    mobile_number: string;
    dob: Date;
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
    bank_name: string;
    branch_name: string;
    ifsc_code: string;
    account_number: string;
    aggregator: 'SWIGGY' | 'ZOMATO' | 'ZEPTO' | 'BLINKIT' | 'BIGBASKET' | 'OTHER';
    aggregator_other?: string;
    aggregator_id: string;
    joined_since: Date;
    avg_earnings_15_days: number;
    onboarded_by: 'SHUBHAM' | 'VAIBHAV';
    aggregator_credentials_checked: boolean;
    id_credentials_checked: boolean;
    retained_document_details: string;
  }>({
    defaultValues: initialData ? {
      first_name: initialData.first_name || '',
      last_name: initialData.last_name || '',
      mobile_number: initialData.mobile_number || '',
      dob: initialData.dob ? new Date(initialData.dob) : new Date(),
      aadhaar_number: initialData.aadhaar_number || '',
      pan_number: initialData.pan_number || '',
      address_line1: initialData.address_line1 || '',
      address_line2: initialData.address_line2 || '',
      city: initialData.city || '',
      state: initialData.state || '',
      pincode: initialData.pincode || '',
      address_google_link: initialData.address_google_link || '',
      marital_status: initialData.marital_status || 'SINGLE',
      dependent_name: initialData.dependent_name || '',
      dependent_relation: initialData.dependent_relation || 'FATHER',
      dependent_aadhaar: initialData.dependent_aadhaar || '',
      bank_name: initialData.bank_name || '',
      branch_name: initialData.branch_name || '',
      ifsc_code: initialData.ifsc_code || '',
      account_number: initialData.account_number || '',
      aggregator: initialData.aggregator || 'SWIGGY',
      aggregator_other: initialData.aggregator_other || '',
      aggregator_id: initialData.aggregator_id || '',
      joined_since: initialData.joined_since ? new Date(initialData.joined_since) : new Date(),
      avg_earnings_15_days: initialData.avg_earnings_15_days || 0,
      onboarded_by: initialData.onboarded_by || 'SHUBHAM',
      aggregator_credentials_checked: initialData.aggregator_credentials_checked || false,
      id_credentials_checked: initialData.id_credentials_checked || false,
      retained_document_details: initialData.retained_document_details || ''
    } : {}
  });

  // Watch address fields for location extraction
  const addressLine1 = form.watch("address_line1") || "";
  const addressLine2 = form.watch("address_line2") || "";
  const pincodeValue = form.watch("pincode") || "";
  
  // Extract suggestions when address changes
  useEffect(() => {
    if (addressLine1 || addressLine2) {
      const suggestions = extractLocationSuggestions(addressLine1, addressLine2);
      setLocationSuggestions(suggestions);
    }
  }, [addressLine1, addressLine2, extractLocationSuggestions]);

  // Filter places when pincode changes or on initial load
  useEffect(() => {
    if (pincodeValue || initialData?.pincode) {
      filterByPincode(pincodeValue || initialData?.pincode || '');
    }
  }, [pincodeValue, filterByPincode, initialData?.pincode]);

  const indianBanks = [
    "STATE BANK OF INDIA", "HDFC BANK", "ICICI BANK", "PUNJAB NATIONAL BANK", 
    "BANK OF BARODA", "CANARA BANK", "UNION BANK", "AXIS BANK", "BANK OF INDIA", 
    "CENTRAL BANK OF INDIA", "INDIAN BANK", "KOTAK MAHINDRA BANK", "YES BANK", 
    "FEDERAL BANK", "SOUTH INDIAN BANK", "KARUR VYSYA BANK", "CITY UNION BANK"
  ];

  const handleFormSubmit = (data: any) => {
    // Transform data to match API expectations
    const transformedData: RiderFormData = {
      ...data,
      dob: format(data.dob, 'yyyy-MM-dd'),
      joined_since: format(data.joined_since, 'yyyy-MM-dd'),
      // Transform text to uppercase as required
      first_name: data.first_name.toUpperCase(),
      last_name: data.last_name.toUpperCase(),
      address_line1: data.address_line1.toUpperCase(),
      address_line2: data.address_line2.toUpperCase(),
      branch_name: data.branch_name.toUpperCase(),
      aggregator_other: data.aggregator_other?.toUpperCase(),
      dependent_name: data.dependent_name?.toUpperCase(),
      retained_document_details: data.retained_document_details.toUpperCase(),
    };

    setFormData(transformedData);
    setShowConfirmation(true);
  };

  const confirmSubmit = () => {
    if (formData) {
      onSubmit(formData);
      setShowConfirmation(false);
    }
  };

  if (showConfirmation && formData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Confirm Rider Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {formData.first_name} {formData.last_name}</div>
              <div><strong>Mobile:</strong> {formData.mobile_number}</div>
              <div><strong>Aadhaar:</strong> {formData.aadhaar_number}</div>
              <div><strong>PAN:</strong> {formData.pan_number}</div>
              <div><strong>Aggregator:</strong> {formData.aggregator}</div>
              <div><strong>Onboarded By:</strong> {formData.onboarded_by}</div>
            </div>
            <div className="flex gap-4">
              <Button onClick={confirmSubmit}>Confirm & Create Rider ID</Button>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Back to Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Section 1: Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Section 1: Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                rules={{ 
                  required: "First name is required",
                  maxLength: { value: 20, message: "Max 20 characters" },
                  pattern: { value: /^[A-Za-z\s]+$/, message: "Alphabets only" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={20} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                rules={{ 
                  required: "Last name is required",
                  maxLength: { value: 20, message: "Max 20 characters" },
                  pattern: { value: /^[A-Za-z\s]+$/, message: "Alphabets only" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={20} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobile_number"
                rules={{ 
                  required: "Mobile number is required",
                  pattern: { value: /^\d{10}$/, message: "Must be 10 digits" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                rules={{ required: "Date of birth is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Day Selector */}
                      <Select
                        value={field.value ? field.value.getDate().toString() : ""}
                        onValueChange={(day) => {
                          const currentDate = field.value || new Date();
                          const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(day));
                          field.onChange(newDate);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Month Selector */}
                      <Select
                        value={field.value ? field.value.getMonth().toString() : ""}
                        onValueChange={(month) => {
                          const currentDate = field.value || new Date();
                          const newDate = new Date(currentDate.getFullYear(), parseInt(month), currentDate.getDate());
                          field.onChange(newDate);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            'January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'
                          ].map((month, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Year Selector */}
                      <Select
                        value={field.value ? field.value.getFullYear().toString() : ""}
                        onValueChange={(year) => {
                          const currentDate = field.value || new Date();
                          const newDate = new Date(parseInt(year), currentDate.getMonth(), currentDate.getDate());
                          field.onChange(newDate);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aadhaar_number"
                rules={{ 
                  required: "Aadhaar number is required",
                  pattern: { value: /^\d{12}$/, message: "Must be 12 digits" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhaar Number *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={12} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pan_number"
                rules={{ 
                  required: "PAN number is required",
                  pattern: { value: /^[A-Z0-9]{10}$/, message: "Must be 10 alphanumeric characters" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN Number *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={10} style={{textTransform: 'uppercase'}} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              <h4 className="font-medium">Current Address</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  rules={{ 
                    required: "Address Line 1 is required",
                    maxLength: { value: 20, message: "Max 20 characters" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line 1 *</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={20} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_line2"
                  rules={{ 
                    required: "Address Line 2 is required",
                    maxLength: { value: 20, message: "Max 20 characters" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line 2 *</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={20} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pincode"
                  rules={{ 
                    required: "Pincode is required",
                    pattern: { value: /^\d{6}$/, message: "Must be 6 digits" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode *
                        {locationSuggestions.pincode && (
                          <Button 
                            type="button" 
                            variant="link" 
                            size="sm" 
                            className="ml-2 h-4 p-0 text-xs text-primary"
                            onClick={() => {
                              field.onChange(locationSuggestions.pincode);
                              filterByPincode(locationSuggestions.pincode!);
                            }}
                          >
                            Suggested: {locationSuggestions.pincode}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          maxLength={6} 
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            filterByPincode(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  rules={{ required: "City is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *
                        {locationSuggestions.city && (
                          <Button 
                            type="button" 
                            variant="link" 
                            size="sm" 
                            className="ml-2 h-4 p-0 text-xs text-primary"
                            onClick={() => field.onChange(locationSuggestions.city)}
                          >
                            Suggested: {locationSuggestions.city}
                          </Button>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {filteredCities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  rules={{ required: "State is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *
                        {locationSuggestions.state && (
                          <Button 
                            type="button" 
                            variant="link" 
                            size="sm" 
                            className="ml-2 h-4 p-0 text-xs text-primary"
                            onClick={() => field.onChange(locationSuggestions.state)}
                          >
                            Suggested: {locationSuggestions.state}
                          </Button>
                        )}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {filteredStates.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address_google_link"
                rules={{ 
                  required: "Google Maps link is required",
                  pattern: { value: /^https?:\/\/.*/, message: "Must be a valid URL" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps Link *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://maps.google.com/..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Marital Status and Dependent Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="marital_status"
                rules={{ required: "Marital status is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SINGLE">SINGLE</SelectItem>
                        <SelectItem value="MARRIED">MARRIED</SelectItem>
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
                name="dependent_name"
                rules={{ 
                  maxLength: { value: 20, message: "Max 20 characters" },
                  pattern: { value: /^[A-Za-z\s]*$/, message: "Alphabets only" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dependent Name</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={20} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dependent_relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation with Dependent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FATHER">FATHER</SelectItem>
                        <SelectItem value="MOTHER">MOTHER</SelectItem>
                        <SelectItem value="BROTHER">BROTHER</SelectItem>
                        <SelectItem value="SPOUSE">SPOUSE</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dependent_aadhaar"
                rules={{ 
                  pattern: { value: /^\d{12}$/, message: "Must be 12 digits" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dependent Aadhaar</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={12} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Banking Information */}
        <Card>
          <CardHeader>
            <CardTitle>Section 2: Banking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank_name"
                rules={{ required: "Bank name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {indianBanks.map(bank => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branch_name"
                rules={{ 
                  required: "Branch name is required",
                  maxLength: { value: 20, message: "Max 20 characters" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={20} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ifsc_code"
                rules={{ 
                  required: "IFSC code is required",
                  pattern: { value: /^[A-Z0-9]{11}$/, message: "Must be 11 alphanumeric characters" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC Code *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={11} style={{textTransform: 'uppercase'}} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_number"
                rules={{ 
                  required: "Account number is required",
                  pattern: { value: /^\d{1,20}$/, message: "Numbers only, max 20 digits" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={20} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Section 3: Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aggregator"
                rules={{ required: "Aggregator is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aggregator *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aggregator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SWIGGY">SWIGGY</SelectItem>
                        <SelectItem value="ZOMATO">ZOMATO</SelectItem>
                        <SelectItem value="ZEPTO">ZEPTO</SelectItem>
                        <SelectItem value="BLINKIT">BLINKIT</SelectItem>
                        <SelectItem value="BIGBASKET">BIGBASKET</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('aggregator') === 'OTHER' && (
                <FormField
                  control={form.control}
                  name="aggregator_other"
                  rules={{ 
                    required: "Please specify aggregator",
                    maxLength: { value: 15, message: "Max 15 characters" },
                    pattern: { value: /^[A-Za-z\s]+$/, message: "Alphabets only" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Other *</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={15} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aggregator_id"
                rules={{ 
                  required: "Aggregator ID is required",
                  maxLength: { value: 15, message: "Max 15 characters" }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aggregator ID *</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={15} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="joined_since"
                rules={{ required: "Joining date is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joined Since *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="avg_earnings_15_days"
              rules={{ 
                required: "Average earnings is required",
                min: { value: 0, message: "Must be positive" },
                max: { value: 9999, message: "Max 4 digits" }
              }}
              render={({ field }) => (
                <FormItem className="w-1/2">
                  <FormLabel>Last 15 Days Avg Earnings *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 4: Office Use */}
        <Card>
          <CardHeader>
            <CardTitle>Section 4: Office Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="onboarded_by"
                rules={{ required: "Onboarded by is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarded By *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SHUBHAM">SHUBHAM</SelectItem>
                        <SelectItem value="VAIBHAV">VAIBHAV</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="aggregator_credentials_checked"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Aggregator Credentials Checked</FormLabel>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="id_credentials_checked"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>ID Credentials Checked</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="retained_document_details"
              rules={{ 
                required: "Document details are required",
                maxLength: { value: 20, message: "Max 20 characters" }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Being Retained *</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={20} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit">Review & Submit</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};