import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
import ProductPhotoUpload from "@/components/ProductPhotoUpload";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@shared/schema";

const CATEGORY_VALUES = ["soft_serve", "milk_tea", "fruit_tea", "shakes", "sundaes", "float_drinks"];

const BADGE_CONFIG = [
  { value: "new", color: "bg-green-500" },
  { value: "popular", color: "bg-yellow-500" },
  { value: "limited", color: "bg-red-500" },
  { value: "sale", color: "bg-blue-500" },
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
  const { t } = useTranslation();
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
      toast({ title: t('products.success'), description: t('products.productCreated') });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.createFailed'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      return await apiRequest('PATCH', `/api/admin/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: t('products.success'), description: t('products.productUpdated') });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.updateFailed'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: t('products.success'), description: t('products.productDeleted') });
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.deleteFailed'), variant: "destructive" });
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
    if (confirm(t('products.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const getBadgeInfo = (badgeValue: string | null) => {
    if (!badgeValue) return null;
    return BADGE_CONFIG.find(b => b.value === badgeValue);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('products.title')}</h2>
          <p className="text-muted-foreground">{t('products.subtitle')}</p>
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
                {t('products.addProduct')}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t('products.editProduct') : t('products.addNewProduct')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productCode">{t('products.productCode')}</Label>
                  <Input
                    id="productCode"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    placeholder="0010001"
                    data-testid="input-product-code"
                  />
                </div>
                <div>
                  <Label htmlFor="cost">{t('products.productCost')} (฿)</Label>
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
                <Label htmlFor="name">{t('products.productName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="input-product-name"
                />
              </div>
              <div>
                <Label htmlFor="description">{t('products.productDescription')}</Label>
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
                  <Label htmlFor="price">{t('products.productPrice')} (฿) *</Label>
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
                  <Label htmlFor="category">{t('products.productCategory')} *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category" data-testid="select-product-category">
                      <SelectValue placeholder={t('products.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_VALUES.map((catValue) => (
                        <SelectItem key={catValue} value={catValue}>
                          {t(`menu.categories.${catValue}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t('products.productImage')}</Label>
                <ProductPhotoUpload
                  currentImageUrl={formData.imageUrl}
                  onImageChange={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="badge">{t('products.promotionalBadge')}</Label>
                  <Select
                    value={formData.badge || "none"}
                    onValueChange={(value) => setFormData({ ...formData, badge: value === "none" ? "" : value })}
                  >
                    <SelectTrigger id="badge" data-testid="select-product-badge">
                      <SelectValue placeholder={t('products.none')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('products.none')}</SelectItem>
                      {BADGE_CONFIG.map((badge) => (
                        <SelectItem key={badge.value} value={badge.value}>
                          {t(`menu.badges.${badge.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sortOrder">{t('products.sortOrder')}</Label>
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
                  <span className="text-sm">{t('products.featured')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="w-4 h-4"
                    data-testid="checkbox-product-available"
                  />
                  <span className="text-sm">{t('products.productAvailable')}</span>
                </label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-product"
                >
                  {t('products.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
                >
                  {editingProduct ? t('products.update') : t('products.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('products.loadingProducts')}</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t('products.noProducts')}</h3>
          <p className="text-muted-foreground mb-4">{t('products.noProductsDesc')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              variant="management"
              onEdit={handleEdit}
              onDelete={(p) => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
