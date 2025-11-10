import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Star } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function CustomerMenu() {
  const [, setLocationPath] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const { t } = useTranslation();
  
  const CATEGORIES = [
    { value: "all", label: t('customer.menu.allItems') },
    { value: "soft_serve", label: t('customer.menu.categories.soft_serve') },
    { value: "milk_tea", label: t('customer.menu.categories.milk_tea') },
    { value: "fruit_tea", label: t('customer.menu.categories.fruit_tea') },
    { value: "shakes", label: t('customer.menu.categories.shakes') },
    { value: "sundaes", label: t('customer.menu.categories.sundaes') },
    { value: "float_drinks", label: t('customer.menu.categories.float_drinks') },
  ];

  const BADGE_STYLES: Record<string, { label: string; className: string }> = {
    new: { label: t('customer.menu.badges.new'), className: "bg-green-500 text-white" },
    popular: { label: t('customer.menu.badges.popular'), className: "bg-primary text-white" },
    limited: { label: t('customer.menu.badges.limited'), className: "bg-red-500 text-white" },
    sale: { label: t('customer.menu.badges.sale'), className: "bg-blue-500 text-white" },
  };

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const filteredProducts = activeCategory === "all"
    ? allProducts.filter(p => p.available)
    : allProducts.filter(p => p.available && p.category === activeCategory);

  const featuredProducts = allProducts.filter(p => p.featured && p.available);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocationPath("/customer")}
              variant="ghost"
              size="icon"
              className="hover-elevate"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoUrl} alt="Yens Logo" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('customer.menu.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('customer.menu.subtitle')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 pb-20">
        {/* Yen's Recommend Section - Matching Website Style */}
        {featuredProducts.length > 0 && (
          <section className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">{t('customer.menu.yensRecommend')}</h2>
              <div className="flex items-center justify-center gap-1 text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary" />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">5/5</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 10).map((product) => (
                <ProductCard key={product.id} product={product} featured={true} />
              ))}
            </div>
          </section>
        )}

        {/* Category Tabs - Cleaner Layout */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto w-full">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="flex-1 min-w-[80px]"
                data-testid={`tab-category-${cat.value}`}
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.value} value={cat.value} className="mt-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('customer.menu.noItems')}</h3>
                  <p className="text-muted-foreground">{t('customer.menu.checkBack')}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  featured?: boolean;
}

function ProductCard({ product, featured }: ProductCardProps) {
  const { t } = useTranslation();
  
  const BADGE_STYLES: Record<string, { label: string; className: string }> = {
    new: { label: t('customer.menu.badges.new'), className: "bg-green-500 text-white" },
    popular: { label: t('customer.menu.badges.popular'), className: "bg-primary text-white" },
    limited: { label: t('customer.menu.badges.limited'), className: "bg-red-500 text-white" },
    sale: { label: t('customer.menu.badges.sale'), className: "bg-blue-500 text-white" },
  };
  
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;

  return (
    <Card 
      className="overflow-hidden bg-card border-border hover-elevate transition-all"
      data-testid={`product-card-${product.id}`}
    >
      {product.imageUrl ? (
        <div className="aspect-[4/5] w-full overflow-hidden bg-muted relative">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            data-testid={`img-product-${product.id}`}
          />
          {badgeStyle && (
            <Badge 
              className={`absolute top-2 right-2 ${badgeStyle.className} shadow-lg text-xs px-2 py-0.5`}
              data-testid={`badge-${product.id}`}
            >
              {badgeStyle.label}
            </Badge>
          )}
        </div>
      ) : (
        <div className="aspect-[4/5] w-full bg-muted flex items-center justify-center relative">
          <Package className="w-12 h-12 text-muted-foreground" />
          {badgeStyle && (
            <Badge 
              className={`absolute top-2 right-2 ${badgeStyle.className} shadow-lg text-xs px-2 py-0.5`}
              data-testid={`badge-${product.id}`}
            >
              {badgeStyle.label}
            </Badge>
          )}
        </div>
      )}
      <div className="p-3 space-y-2 text-center">
        <div>
          <h3 
            className="font-bold text-foreground text-base leading-tight" 
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="pt-1">
          <div 
            className="text-xl font-bold text-primary"
            data-testid={`text-product-price-${product.id}`}
          >
            ฿{parseFloat(product.price.toString()).toFixed(0)}
          </div>
        </div>
      </div>
    </Card>
  );
}
