import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import ProductCSVImport from "@/components/ProductCSVImport";
import type { Product } from "@shared/schema";

const CATEGORIES = [
  { value: "soft_serve", label: "Soft Serve" },
  { value: "milk_tea", label: "Milk Tea" },
  { value: "fruit_tea", label: "Fruit Tea" },
  { value: "shakes", label: "Shakes/Smoothies" },
  { value: "sundaes", label: "Sundaes" },
  { value: "float_drinks", label: "Float Drinks" },
];

const BADGES = [
  { value: "new", label: "New!", color: "bg-green-500" },
  { value: "popular", label: "Popular!", color: "bg-yellow-500" },
  { value: "limited", label: "Limited Time", color: "bg-red-500" },
  { value: "sale", label: "On Sale!", color: "bg-blue-500" },
];

interface ProductFormData {
  productCode: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  category: string;
  imageUrl: string;
  badge: string;
  featured: boolean;
  available: boolean;
  sortOrder: number;
}

export default function ProductManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    productCode: "",
    name: "",
    description: "",
    price: "",
    cost: "",
    category: "",
    imageUrl: "",
    badge: "",
    featured: false,
    available: true,
    sortOrder: 0,
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return await apiRequest('POST', '/api/admin/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Success", description: "Product created successfully!" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      return await apiRequest('PATCH', `/api/admin/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Success", description: "Product updated successfully!" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: "Success", description: "Product deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      productCode: "",
      name: "",
      description: "",
      price: "",
      cost: "",
      category: "",
      imageUrl: "",
      badge: "",
      featured: false,
      available: true,
      sortOrder: 0,
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      productCode: product.productCode || "",
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      category: product.category,
      imageUrl: product.imageUrl || "",
      badge: product.badge || "",
      featured: product.featured,
      available: product.available,
      sortOrder: product.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const getBadgeInfo = (badgeValue: string | null) => {
    if (!badgeValue) return null;
    return BADGES.find(b => b.value === badgeValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground">Manage your menu items</p>
        </div>
        <div className="flex gap-2">
          <ProductCSVImport />
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product" className="hover-elevate active-elevate-2">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productCode">Product Code</Label>
                  <Input
                    id="productCode"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    placeholder="0010001"
                    data-testid="input-product-code"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Cost (฿)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-product-cost"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-product-name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  data-testid="input-product-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (฿) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    data-testid="input-product-price"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category" data-testid="select-product-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-product-image"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="badge">Promotional Badge</Label>
                  <Select
                    value={formData.badge || "none"}
                    onValueChange={(value) => setFormData({ ...formData, badge: value === "none" ? "" : value })}
                  >
                    <SelectTrigger id="badge" data-testid="select-product-badge">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {BADGES.map((badge) => (
                        <SelectItem key={badge.value} value={badge.value}>
                          {badge.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-product-sort"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="w-4 h-4"
                    data-testid="checkbox-product-featured"
                  />
                  <span className="text-sm">Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-4 h-4"
                    data-testid="checkbox-product-available"
                  />
                  <span className="text-sm">Available</span>
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-product"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
                >
                  {editingProduct ? "Update" : "Create"} Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No products yet</h3>
          <p className="text-muted-foreground mb-4">Add your first product to get started</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const badgeInfo = getBadgeInfo(product.badge);
            return (
              <Card key={product.id} className="overflow-hidden" data-testid={`product-card-${product.id}`}>
                {product.imageUrl && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                    {badgeInfo && (
                      <Badge className={`${badgeInfo.color} text-white text-xs`}>
                        {badgeInfo.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground" data-testid={`text-product-price-${product.id}`}>
                      ฿{parseFloat(product.price.toString()).toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                      {product.featured && (
                        <Badge variant="outline" className="text-xs">Featured</Badge>
                      )}
                      {!product.available && (
                        <Badge variant="secondary" className="text-xs">Sold Out</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(product)}
                      variant="outline"
                      size="sm"
                      className="flex-1 hover-elevate active-elevate-2"
                      data-testid={`button-edit-${product.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(product.id)}
                      variant="outline"
                      size="sm"
                      className="hover-elevate active-elevate-2"
                      data-testid={`button-delete-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
