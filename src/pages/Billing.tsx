import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Printer, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PrintableBill } from "@/components/PrintableBill";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
interface BillItem {
  id: string;
  categoryId: string;
  categoryName: string;
  weight: number;
  goldAmount: number;
  seikuliAmount: number;
  seikuliRate: number;
  total: number;
}
interface Category {
  id: string;
  name: string;
  seikuli_rate: number;
}
const Billing = () => {
  const [goldRate, setGoldRate] = useState(0);
  const [gstPercentage, setGstPercentage] = useState(3);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    categoryId: "",
    weight: ""
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const settingsChannel = supabase.channel('billing-settings').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settings'
    }, () => {
      fetchSettings();
    }).subscribe();
    const categoriesChannel = supabase.channel('billing-categories').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'categories'
    }, () => {
      fetchCategories();
    }).subscribe();
    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);
  const fetchData = async () => {
    await Promise.all([fetchSettings(), fetchCategories()]);
    setLoading(false);
  };
  const fetchSettings = async () => {
    const {
      data
    } = await supabase.from('settings').select('*').single();
    if (data) {
      setGoldRate(Number(data.gold_rate));
      setGstPercentage(Number((data as any).gst_rate) || 3);
    }
  };
  const fetchCategories = async () => {
    const {
      data: categoriesData
    } = await supabase.from('categories').select('*').order('name');
    if (categoriesData) {
      setCategories(categoriesData);
    }
  };
  const handleAddItem = () => {
    if (!currentItem.categoryId || !currentItem.weight) {
      toast.error("Please fill all item details");
      return;
    }
    const category = categories.find(c => c.id === currentItem.categoryId);
    if (!category) return;
    const weight = parseFloat(currentItem.weight);
    const goldAmount = weight * goldRate;
    const seikuliAmount = weight * category.seikuli_rate;
    const total = goldAmount + seikuliAmount;
    if (editingItemId) {
      // Update existing item
      const updatedItems = billItems.map(item => item.id === editingItemId ? {
        id: item.id,
        categoryId: category.id,
        categoryName: category.name,
        weight,
        goldAmount,
        seikuliAmount,
        seikuliRate: category.seikuli_rate,
        total
      } : item);
      setBillItems(updatedItems);
      setEditingItemId(null);
      toast.success("Item has been updated successfully");
    } else {
      // Add new item
      const newItem: BillItem = {
        id: Date.now().toString(),
        categoryId: category.id,
        categoryName: category.name,
        weight,
        goldAmount,
        seikuliAmount,
        seikuliRate: category.seikuli_rate,
        total
      };
      setBillItems([...billItems, newItem]);
      toast.success("Item has been added to the bill");
    }
    setCurrentItem({
      categoryId: "",
      weight: ""
    });
  };
  const handleEditItem = (id: string) => {
    const itemToEdit = billItems.find(item => item.id === id);
    if (itemToEdit) {
      setCurrentItem({
        categoryId: itemToEdit.categoryId,
        weight: itemToEdit.weight.toString()
      });
      setEditingItemId(id);
      toast("Modify the item details below", { icon: "✏️" });
    }
  };
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setCurrentItem({
      categoryId: "",
      weight: ""
    });
  };
  const handleDeleteItem = (id: string) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };
  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const gstAmount = subtotal * gstPercentage / 100;
  const grandTotal = subtotal + gstAmount;
  const handlePrintBill = async () => {
    if (!customerName || billItems.length === 0) {
      toast.error("Please add customer name and at least one item");
      return;
    }
    try {
      // Save bill to database
      const {
        data: billData,
        error: billError
      } = await supabase.from('bills' as any).insert({
        customer_name: customerName,
        bill_date: new Date().toISOString(),
        gold_rate: goldRate,
        gst_percentage: gstPercentage,
        subtotal,
        gst_amount: gstAmount,
        grand_total: grandTotal
      }).select().single();
      if (billError || !billData) throw billError || new Error('No data returned');

      // Save bill items
      const itemsToInsert = billItems.map(item => ({
        bill_id: (billData as any).id,
        category_id: item.categoryId,
        category_name: item.categoryName,
        weight: item.weight,
        gold_amount: item.goldAmount,
        seikuli_amount: item.seikuliAmount,
        seikuli_rate: item.seikuliRate,
        total: item.total
      }));
      const {
        error: itemsError
      } = await supabase.from('bill_items' as any).insert(itemsToInsert);
      if (itemsError) throw itemsError;
      toast.success(`Bill for ${customerName} has been saved`);

      // Trigger print dialog after successful save
      setTimeout(() => {
        window.print();
      }, 500);

      // Reset form after printing
      setTimeout(() => {
        setCustomerName("");
        setBillItems([]);
      }, 1500);
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error("Failed to save bill. Please try again.");
    }
  };
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-[27px] py-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div>
                    <h1 className="text-2xl font-bold">New Bill</h1>
                    <p className="text-sm text-muted-foreground">Create billing invoice</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Gold Rate Today</p>
                  <p className="text-4xl font-bold text-primary">₹{goldRate.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">per gram</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-4 py-4 max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Add Items */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Customer Info */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
                        <Input id="customerName" placeholder="Enter customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Current Rates Display */}
                  

                  {/* Add Item Form */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{editingItemId ? "Edit Item" : "Add Item"}</CardTitle>
                      <CardDescription className="text-sm">
                        {editingItemId ? "Update the item details" : "Add jewellery items to the bill"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="category" className="text-sm">Category</Label>
                          <Select value={currentItem.categoryId} onValueChange={value => setCurrentItem({
                          ...currentItem,
                          categoryId: value
                        })}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name} (₹{cat.seikuli_rate}/g)
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="weight" className="text-sm">Weight (grams)</Label>
                          <Input id="weight" type="number" step="0.01" placeholder="2.5" value={currentItem.weight} onChange={e => setCurrentItem({
                          ...currentItem,
                          weight: e.target.value
                        })} className="h-9" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddItem} className="flex-1 gap-2 h-9">
                          {editingItemId ? <>
                              <Pencil className="h-4 w-4" />
                              Update Item
                            </> : <>
                              <Plus className="h-4 w-4" />
                              Add to Bill
                            </>}
                        </Button>
                        {editingItemId && <Button onClick={handleCancelEdit} variant="outline" className="px-6 h-9">
                            Cancel
                          </Button>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bill Items List */}
                  {billItems.length > 0 && <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Bill Items ({billItems.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {billItems.map(item => <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-base">
                                  {item.categoryName}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {item.weight}g • Gold: ₹{item.goldAmount.toLocaleString()} • Seikuli (₹{item.seikuliRate}/g): ₹{item.seikuliAmount.toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-3">
                                <div className="text-right mr-2">
                                  <div className="font-bold text-base">₹{item.total.toLocaleString()}</div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleEditItem(item.id)} className="hover:bg-primary/10 h-8 w-8">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:text-destructive h-8 w-8">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>)}
                        </div>
                      </CardContent>
                    </Card>}
                </div>

                {/* Right Column - Bill Summary */}
                <div className="lg:col-span-1">
                  <Card className="border-0 shadow-lg sticky top-20 px-[3px] mx-0 py-[60px] rounded-3xl">
                    <CardHeader className="pb-3 py-0">
                      <CardTitle className="text-lg">Bill Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4 px-[14px] py-[31px]">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GST ({gstPercentage}%)</span>
                          <span className="font-semibold">₹{gstAmount.toLocaleString()}</span>
                        </div>

                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold">Grand Total</span>
                            <span className="font-bold text-primary text-3xl my-[19px]">
                              ₹{grandTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button onClick={handlePrintBill} className="w-full gap-2 bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 h-10">
                        <Printer className="h-4 w-4" />
                        Print Bill
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>

          <Footer />

          {/* Printable Bill (Hidden, only shows when printing) */}
          <PrintableBill customerName={customerName} billItems={billItems} goldRate={goldRate} gstPercentage={gstPercentage} subtotal={subtotal} gstAmount={gstAmount} grandTotal={grandTotal} />
        </div>
      </div>
    </SidebarProvider>;
};
export default Billing;