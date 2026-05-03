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
import { Plus, Edit, Trash2, Package, AlertTriangle, Camera, CheckCircle2 } from "lucide-react";
import ProductCSVImport from "@/components/ProductCSVImport";
import ProductPhotoUpload from "@/components/ProductPhotoUpload";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@shared/schema";

const CATEGORY_VALUES = ["soft_serve", "milk_tea", "fruit_tea", "shakes", "sundaes", "float_drinks"];

const BADGE_CONFIG = [
  { value: "new",     color: "bg-green-500" },
  { value: "popular", color: "bg-yellow-500" },
  { value: "limited", color: "bg-red-500" },
  { value: "sale",    color: "bg-blue-500" },
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
  promoFocus: boolean;
  available: boolean;
  sortOrder: number;
  isRedeemable: boolean;
  pointCost: number;
}

export default function ProductManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData]             = useState<ProductFormData>({
    productCode: "",
    name: "",
    description: "",
    price: "",
    cost: "",
    category: "",
    imageUrl: "",
    badge: "",
    featured: false,
    promoFocus: false,
    available: true,
    sortOrder: 0,
    isRedeemable: false,
    pointCost: 100,
  });
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // ── Quick-photo dialog state ──────────────────────────────────────────────
  const [quickPhotoProduct, setQuickPhotoProduct] = useState<Product | null>(null);
  const [quickPhotoUrl, setQuickPhotoUrl]         = useState("");
  const [quickPhotoSaved, setQuickPhotoSaved]     = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) =>
      await apiRequest('POST', '/api/admin/products', data),
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
      await apiRequest('PATCH', `/api/admin/products/${id}`, data),
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

  // Saves only the imageUrl for a product — used by the quick-photo dialog
  const quickPhotoMutation = useMutation({
    mutationFn: async ({ id, imageUrl }: { id: string; imageUrl: string }) =>
      await apiRequest('PATCH', `/api/admin/products/${id}`, { imageUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setQuickPhotoSaved(true);
      toast({ title: "Photo saved", description: `Photo updated for ${quickPhotoProduct?.name}` });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save the photo. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      await apiRequest('DELETE', `/api/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: t('products.success'), description: t('products.productDeleted') });
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.deleteFailed'), variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () =>
      await apiRequest('DELETE', '/api/admin/products'),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: t('products.success'), description: t('products.allProductsDeleted', { count: response.deletedCount || 0 }) });
      setShowDeleteAllDialog(false);
    },
    onError: () => {
      toast({ title: t('products.error'), description: t('products.deleteAllFailed'), variant: "destructive" });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

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
      promoFocus: false,
      available: true,
      sortOrder: 0,
      isRedeemable: false,
      pointCost: 100,
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
      promoFocus: product.promoFocus || false,
      available: product.available,
      sortOrder: product.sortOrder,
      isRedeemable: (product as any).isRedeemable || false,
      pointCost: (product as any).pointCost || 100,
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

  // Opens the quick-photo dialog for a specific product
  const openQuickPhoto = (product: Product) => {
    setQuickPhotoProduct(product);
    setQuickPhotoUrl(product.imageUrl || "");
    setQuickPhotoSaved(false);
  };

  const closeQuickPhoto = () => {
    setQuickPhotoProduct(null);
    setQuickPhotoUrl("");
    setQuickPhotoSaved(false);
  };

  // Called by ProductPhotoUpload as soon as the image finishes uploading
  const handleQuickPhotoUploaded = (url: string) => {
    setQuickPhotoUrl(url);
    if (quickPhotoProduct && url) {
      quickPhotoMutation.mutate({ id: quickPhotoProduct.id, imageUrl: url });
    }
  };

  const missingPhotoCount = products.filter(p => !p.imageUrl).length;

  return (
    <div className="space-y-6">
      {/* ── Branded header ── */}
      <div className="bg-blue-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-yellow-400 rounded-xl p-3 shrink-0 shadow-lg">
            <Package className="h-5 w-5 text-blue-900" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black uppercase tracking-tight leading-none">{t('products.title')}</h2>
            <p className="text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] mt-1.5 opacity-90">{t('products.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {products.length > 0 && (
              <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white bg-transparent"
                    data-testid="button-delete-all-products"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('products.deleteAll')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      {t('products.deleteAllTitle')}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground py-4">
                    {t('products.deleteAllWarning', { count: products.length })}
                  </p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} data-testid="button-cancel-delete-all">
                      {t('products.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteAllMutation.mutate()}
                      disabled={deleteAllMutation.isPending}
                      data-testid="button-confirm-delete-all"
                    >
                      {deleteAllMutation.isPending ? t('common.deleting') : t('products.deleteAllConfirm')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <ProductCSVImport />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-yellow-400 text-blue-900 font-bold"
                  data-testid="button-add-product"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('products.addProduct')}
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 border-none shadow-2xl rounded-[2rem] max-w-2xl overflow-hidden">
                <div className="bg-blue-900 rounded-t-[2rem] p-6 flex items-center gap-4">
                  <div className="bg-yellow-400 rounded-xl p-2.5 shadow-lg shrink-0">
                    <Package className="h-4 w-4 text-blue-900" />
                  </div>
                  <h2 className="text-base font-black uppercase tracking-tight text-white leading-none">
                    {editingProduct ? t('products.editProduct') : t('products.addNewProduct')}
                  </h2>
                </div>
                <div className="max-h-[75vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-8 space-y-4">

                  {/* ── Photo first ── */}
                  <div>
                    <Label>{t('products.productImage')}</Label>
                    <ProductPhotoUpload
                      currentImageUrl={formData.imageUrl}
                      onImageChange={(url) => setFormData({ ...formData, imageUrl: url })}
                    />
                  </div>

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
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="w-4 h-4" data-testid="checkbox-product-featured" />
                      <span className="text-sm">{t('products.featured')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.promoFocus} onChange={(e) => setFormData({ ...formData, promoFocus: e.target.checked })} className="w-4 h-4 accent-orange-500" data-testid="checkbox-product-promo-focus" />
                      <span className="text-sm text-orange-600 font-medium">{t('products.promoFocus')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} className="w-4 h-4" data-testid="checkbox-product-available" />
                      <span className="text-sm">{t('products.productAvailable')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.isRedeemable} onChange={(e) => setFormData({ ...formData, isRedeemable: e.target.checked })} className="w-4 h-4 accent-green-600" data-testid="checkbox-product-redeemable" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">{t('products.redeemable', 'Redeemable with points')}</span>
                    </label>
                  </div>
                  {formData.isRedeemable && (
                    <div className="space-y-2">
                      <Label htmlFor="pointCost">{t('products.pointCost', 'Point Cost for Redemption')}</Label>
                      <Input
                        id="pointCost"
                        type="number"
                        min="1"
                        value={formData.pointCost}
                        onChange={(e) => setFormData({ ...formData, pointCost: parseInt(e.target.value) || 100 })}
                        data-testid="input-product-point-cost"
                      />
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" className="border-blue-900/10 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-product">
                      {t('products.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-yellow-400 text-blue-900 font-black uppercase text-[10px] tracking-widest rounded-xl"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-product"
                    >
                      {editingProduct ? t('products.update') : t('products.create')}
                    </Button>
                  </DialogFooter>
                </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Missing-photo banner */}
      {missingPhotoCount > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-sm">
          <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4 text-blue-900" />
          </div>
          <span className="text-blue-900 font-bold">
            <strong className="font-black">{missingPhotoCount} product{missingPhotoCount !== 1 ? "s" : ""}</strong> missing photos — click the camera icon on any card to add one instantly.
          </span>
        </div>
      )}

      {/* ── Quick-photo dialog ── */}
      <Dialog open={!!quickPhotoProduct} onOpenChange={(open) => { if (!open) closeQuickPhoto(); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-quick-photo">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {quickPhotoSaved ? "Photo saved" : `Add photo — ${quickPhotoProduct?.name}`}
            </DialogTitle>
          </DialogHeader>

          {quickPhotoSaved ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">
                Photo saved for <strong>{quickPhotoProduct?.name}</strong>.
              </p>
              {quickPhotoUrl && (
                <img src={quickPhotoUrl} alt={quickPhotoProduct?.name} className="w-full max-h-48 object-contain rounded-md border" />
              )}
              <Button onClick={closeQuickPhoto} className="w-full bg-blue-900 hover:bg-blue-800 text-white" data-testid="button-quick-photo-done">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a photo — it will be saved immediately.
              </p>
              <ProductPhotoUpload
                currentImageUrl={quickPhotoUrl}
                onImageChange={handleQuickPhotoUploaded}
              />
              {quickPhotoMutation.isPending && (
                <p className="text-sm text-muted-foreground text-center">Saving…</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeQuickPhoto} data-testid="button-quick-photo-cancel">Cancel</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Product grid ── */}
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
              onQuickPhoto={openQuickPhoto}
            />
          ))}
        </div>
      )}
    </div>
  );
}
