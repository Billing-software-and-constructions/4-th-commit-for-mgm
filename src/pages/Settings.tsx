import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Category {
  id: string;
  name: string;
  seikuli_rate: number;
}
const Settings = () => {
  const [goldRate, setGoldRate] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategorySeikuli, setNewCategorySeikuli] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategorySeikuli, setEditCategorySeikuli] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchSettings();
    fetchCategories();

    // Set up real-time subscriptions
    const settingsChannel = supabase.channel('settings-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settings'
    }, () => {
      fetchSettings();
    }).subscribe();
    const categoriesChannel = supabase.channel('categories-changes').on('postgres_changes', {
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
  const fetchSettings = async () => {
    const {
      data,
      error
    } = await supabase.from('settings').select('*').single();
    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setGoldRate(data.gold_rate.toString());
      setGstRate((data as any).gst_rate?.toString() || "3");
    }
    setLoading(false);
  };
  const fetchCategories = async () => {
    const {
      data: categoriesData,
      error: categoriesError
    } = await supabase.from('categories').select('*').order('name');
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return;
    }
    setCategories(categoriesData || []);
  };
  const handleSaveRates = async () => {
    const {
      error
    } = await supabase.from('settings').update({
      gold_rate: parseFloat(goldRate),
      gst_rate: parseFloat(gstRate)
    }).eq('id', (await supabase.from('settings').select('id').single()).data?.id);
    if (error) {
      toast.error("Failed to update rates");
    } else {
      toast.success("Gold rate and GST rate have been saved successfully.");
    }
  };
  const handleAddCategory = async () => {
    if (!newCategory.trim() || !newCategorySeikuli.trim()) {
      toast.error("Please enter both category name and seikuli rate");
      return;
    }
    const {
      error
    } = await supabase.from('categories').insert({
      name: newCategory,
      seikuli_rate: parseFloat(newCategorySeikuli)
    });
    if (error) {
      toast.error(error.message);
    } else {
      const addedCategoryName = newCategory;
      setNewCategory("");
      setNewCategorySeikuli("");
      toast.success(`${addedCategoryName} has been added successfully.`);
    }
  };
  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete({
      id: category.id,
      name: category.name
    });
    setShowDeleteDialog(true);
  };
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const {
      error
    } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${categoryToDelete.name} has been removed successfully.`);
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };
  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategorySeikuli(category.seikuli_rate.toString());
  };
  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim() || !editCategorySeikuli.trim()) {
      toast.error("Please enter both category name and seikuli rate");
      return;
    }
    const {
      error
    } = await supabase.from('categories').update({
      name: editCategoryName,
      seikuli_rate: parseFloat(editCategorySeikuli)
    }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setEditingCategoryId(null);
      setEditCategoryName("");
      setEditCategorySeikuli("");
      toast.success("Category has been updated successfully.");
    }
  };
  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName("");
    setEditCategorySeikuli("");
  };
  return <SidebarProvider>
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
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage rates and categories</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-br from-background via-accent/20 to-background">
            <div className="container mx-auto px-6 py-8 max-w-5xl">
              <div className="space-y-6">
                {/* Rates Section */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Daily Rates</CardTitle>
                    <CardDescription>Update gold rate per gram and GST percentage (Seikuli rates are set per category below)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="goldRate">Gold Rate (per gram)</Label>
                        <Input id="goldRate" type="number" placeholder="10000" value={goldRate} onChange={e => setGoldRate(e.target.value)} className="text-lg font-semibold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gstRate">GST (%)</Label>
                        <Input id="gstRate" type="number" step="0.1" placeholder="3" value={gstRate} onChange={e => setGstRate(e.target.value)} className="text-lg font-semibold" />
                      </div>
                    </div>
                    <Button onClick={handleSaveRates} className="w-full md:w-auto">
                      Save Rates
                    </Button>
                  </CardContent>
                </Card>

                {/* Categories Section */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Manage product categories with their seikuli rates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Category */}
                    <div className="space-y-2">
                      <Label>Add New Category</Label>
                      <div className="flex gap-2">
                        <Input placeholder="Category name" value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleAddCategory()} />
                        <Input placeholder="Seikuli rate" type="number" value={newCategorySeikuli} onChange={e => setNewCategorySeikuli(e.target.value)} onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleAddCategory()} className="max-w-[150px]" />
                        <Button onClick={handleAddCategory} className="gap-2 whitespace-nowrap">
                          <Plus className="h-4 w-4" />
                          Add Category
                        </Button>
                      </div>
                    </div>

                    {/* Display Categories */}
                    <div className="space-y-3">
                      {categories.map(category => <Card key={category.id} className="border-2">
                          <CardContent className="pt-4">
                            {editingCategoryId === category.id ? <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Input placeholder="Category name" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} />
                                  <Input placeholder="Seikuli rate" type="number" value={editCategorySeikuli} onChange={e => setEditCategorySeikuli(e.target.value)} className="max-w-[150px]" />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => handleUpdateCategory(category.id)} size="sm">
                                    Save
                                  </Button>
                                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                                    Cancel
                                  </Button>
                                </div>
                              </div> : <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-lg">{category.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Seikuli Rate: ₹{category.seikuli_rate}/gram
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(category)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>}
                          </CardContent>
                        </Card>)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
          
          <Footer />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{categoryToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-600 hover:bg-red-700 text-gray-50">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>;
};
export default Settings;