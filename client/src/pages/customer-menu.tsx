import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package } from "lucide-react";
import logoUrl from "@assets/yens logo_1760702216221.png";
import type { Product } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All Items" },
  { value: "soft_serve", label: "Soft Serve" },
  { value: "milk_tea", label: "Milk Tea" },
  { value: "fruit_tea", label: "Fruit Tea" },
  { value: "shakes", label: "Shakes" },
  { value: "sundaes", label: "Sundaes" },
  { value: "float_drinks", label: "Float Drinks" },
];

const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  new: { label: "New!", className: "bg-green-500 text-white" },
  popular: { label: "Popular!", className: "bg-yellow-500 text-white" },
  limited: { label: "Limited Time", className: "bg-red-500 text-white" },
  sale: { label: "On Sale!", className: "bg-blue-500 text-white" },
};

export default function CustomerMenu() {
  const [, setLocationPath] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");

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
              <h1 className="text-xl font-bold text-foreground">Our Menu</h1>
              <p className="text-sm text-muted-foreground">Yens Thai Ice Cream</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Featured Items</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} featured />
              ))}
            </div>
          </section>
        )}

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
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
                  <p className="text-muted-foreground">Loading menu...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No items available</h3>
                  <p className="text-muted-foreground">Check back soon for new items!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
  const badgeStyle = product.badge ? BADGE_STYLES[product.badge] : null;

  return (
    <Card 
      className={`overflow-hidden hover-elevate transition-all ${featured ? 'ring-2 ring-primary' : ''}`}
      data-testid={`product-card-${product.id}`}
    >
      {product.imageUrl ? (
        <div className="aspect-square w-full overflow-hidden bg-muted relative">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            data-testid={`img-product-${product.id}`}
          />
          {badgeStyle && (
            <Badge 
              className={`absolute top-2 right-2 ${badgeStyle.className} shadow-lg`}
              data-testid={`badge-${product.id}`}
            >
              {badgeStyle.label}
            </Badge>
          )}
        </div>
      ) : (
        <div className="aspect-square w-full bg-muted flex items-center justify-center relative">
          <Package className="w-16 h-16 text-muted-foreground" />
          {badgeStyle && (
            <Badge 
              className={`absolute top-2 right-2 ${badgeStyle.className} shadow-lg`}
              data-testid={`badge-${product.id}`}
            >
              {badgeStyle.label}
            </Badge>
          )}
        </div>
      )}
      <div className="p-4 space-y-2">
        <div>
          <h3 
            className="font-semibold text-foreground text-lg" 
            data-testid={`text-product-name-${product.id}`}
          >
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span 
            className="text-2xl font-bold text-primary"
            data-testid={`text-product-price-${product.id}`}
          >
            ฿{parseFloat(product.price.toString()).toFixed(0)}
          </span>
          {featured && (
            <Badge variant="outline" className="border-primary text-primary">
              Featured
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
