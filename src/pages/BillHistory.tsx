import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, Eye } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay, endOfDay, setYear, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import toast from "react-hot-toast";

// Helper function to get current date in IST
const getISTDate = () => {
  const istDateString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istDateString);
};

interface Bill {
  id: string;
  customer_name: string;
  bill_date: string;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  gold_rate?: number;
  gst_percentage?: number;
}

interface BillItem {
  id: string;
  category_name: string;
  weight: number;
  gold_amount: number;
  seikuli_amount: number;
  seikuli_rate: number;
}

const BillHistory = () => {
  const todayIST = getISTDate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [startDate, setStartDate] = useState<Date>(todayIST);
  const [endDate, setEndDate] = useState<Date>(todayIST);
  const [selectedYear, setSelectedYear] = useState<number>(getYear(todayIST));
  const [isFiltering, setIsFiltering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Generate year options from 2020 to 2099
  const yearOptions = Array.from({ length: 80 }, (_, i) => 2020 + i);

  useEffect(() => {
    // Load bills for current date by default
    loadBills();

    // Set up real-time subscription
    const channel = supabase
      .channel('bills-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills'
        },
        () => {
          // Reload bills when any change occurs
          loadBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  const loadBills = async () => {
    try {
      setLoading(true);
      
      // Get start and end of day in ISO format
      const startOfDayISO = startOfDay(startDate).toISOString();
      const endOfDayISO = endOfDay(endDate).toISOString();

      const { data, error } = await supabase
        .from('bills' as any)
        .select('*')
        .gte('bill_date', startOfDayISO)
        .lte('bill_date', endOfDayISO)
        .order('bill_date', { ascending: false });

      if (error) throw error;

      setBills((data as any) || []);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    setIsFiltering(true);
    loadBills();
    setIsFiltering(false);
  };

  const handleDateChange = (date: Date | undefined, isStartDate: boolean) => {
    if (date) {
      if (isStartDate) {
        setStartDate(date);
      } else {
        setEndDate(date);
      }
      // Automatically update year dropdown when date changes
      const yearFromDate = getYear(date);
      if (yearFromDate !== selectedYear) {
        setSelectedYear(yearFromDate);
      }
    }
  };

  const handleResetFilter = () => {
    const today = getISTDate();
    setStartDate(today);
    setEndDate(today);
    setSelectedYear(getYear(today));
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year);
    setSelectedYear(newYear);
    // Update dates to the selected year
    const newStartDate = setYear(startDate, newYear);
    const newEndDate = setYear(endDate, newYear);
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleViewDetails = async (bill: Bill) => {
    setSelectedBill(bill);
    setIsDialogOpen(true);
    setLoadingDetails(true);
    
    try {
      const { data, error } = await supabase
        .from('bill_items' as any)
        .select('*')
        .eq('bill_id', bill.id);

      if (error) throw error;

      setBillItems((data as any) || []);
    } catch (error) {
      console.error('Error loading bill details:', error);
      toast.error("Failed to load bill details");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold">Bill History</h1>
                    <p className="text-sm text-muted-foreground">View past billing records</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-6 py-8 max-w-6xl">
              {/* Date Filter Section */}
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Date Filters
                  </CardTitle>
                  <CardDescription>
                    Filter bills by date range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-4">
                    {/* Start Date */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleDateChange(date, true)}
                            month={startDate}
                            onMonthChange={(newMonth) => {
                              if (newMonth) {
                                const yearFromMonth = getYear(newMonth);
                                if (yearFromMonth !== selectedYear) {
                                  setSelectedYear(yearFromMonth);
                                }
                              }
                            }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium mb-2 block">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleDateChange(date, false)}
                            month={endDate}
                            onMonthChange={(newMonth) => {
                              if (newMonth) {
                                const yearFromMonth = getYear(newMonth);
                                if (yearFromMonth !== selectedYear) {
                                  setSelectedYear(yearFromMonth);
                                }
                              }
                            }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Year Selector */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleApplyFilter}
                        disabled={isFiltering}
                        className="gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Apply Filter
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleResetFilter}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bills List */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Bills</CardTitle>
                  <CardDescription>
                    {loading ? "Loading..." : `${bills.length} bill(s) found for ${format(startDate, "PP")}`}
                    {!loading && startDate.getTime() !== endDate.getTime() && ` - ${format(endDate, "PP")}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading bills...</p>
                    </div>
                  ) : bills.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-4">No bills found for the selected date range</p>
                      <Link to="/billing">
                        <Button>Create New Bill</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-4"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-lg">
                              {bill.customer_name}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {format(new Date(bill.bill_date), "PPP")} • {format(new Date(bill.bill_date), "p")}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Grand Total</div>
                            <div className="text-2xl font-bold text-primary">
                              ₹{Number(bill.grand_total).toLocaleString()}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(bill)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>

      {/* Bill Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          ) : selectedBill ? (
            <div className="space-y-6">
              {/* Bill Header Info */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedBill.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedBill.bill_date), "PPP")} • {format(new Date(selectedBill.bill_date), "p")}
                    </p>
                  </div>
                  {selectedBill.gold_rate && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Gold Rate</p>
                      <p className="font-semibold">₹{selectedBill.gold_rate}/gram</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bill Items */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3">
                  <h4 className="font-semibold">Items</h4>
                </div>
                <div className="divide-y">
                  {billItems.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      No items found
                    </div>
                  ) : (
                    billItems.map((item) => (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{item.category_name}</div>
                          <div className="text-sm text-muted-foreground">{item.weight}g</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Gold Amount:</span>
                            <span className="ml-2 font-medium">₹{item.gold_amount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Seikuli:</span>
                            <span className="ml-2 font-medium">₹{item.seikuli_amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-1">(₹{item.seikuli_rate}/g)</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bill Summary */}
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{Number(selectedBill.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    GST {selectedBill.gst_percentage ? `(${selectedBill.gst_percentage}%)` : ''}:
                  </span>
                  <span className="font-medium">₹{Number(selectedBill.gst_amount).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="text-primary">₹{Number(selectedBill.grand_total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default BillHistory;
