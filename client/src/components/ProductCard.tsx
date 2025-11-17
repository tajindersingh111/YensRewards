import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ShoppingCart, Eye } from "lucide-react";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: Product;
  variant?: "management" | "transaction" | "browse" | "reference";
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onView?: (product: Product) => void;
}

export function ProductCard({
  product,
  variant = "browse",
  onEdit,
  onDelete,
  onAddToCart,
  onView,
}: ProductCardProps) {
  const { t, i18n } = useTranslation();
  
  const categoryTranslation = product.category 
    ? t(`admin.products.categories.${product.category}`)
    : "";

  const formatPrice = (price: string | number) => {
    return `฿${Number(price).toFixed(2)}`;
  };

  const getBadgeVariant = (badge: string | null) => {
    switch (badge) {
      case "new":
        return "default";
      case "popular":
        return "secondary";
      case "limited":
        return "destructive";
      case "sale":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate h-full flex flex-col" data-testid={`card-product-${product.id}`}>
      {/* Image Container - Fixed Aspect Ratio */}
      <div className="relative w-full bg-muted" style={{ paddingBottom: "75%" }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
            data-testid={`img-product-${product.id}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">{t('admin.products.noImage')}</span>
          </div>
        )}
        
        {/* Badge Overlay */}
        {product.badge && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant={getBadgeVariant(product.badge)}
              className="text-xs"
              data-testid={`badge-${product.badge}-${product.id}`}
            >
              {product.badge === "menu_badges_new" ? t('common.new') : product.badge.toUpperCase()}
            </Badge>
          </div>
        )}
        
        {/* Featured Star */}
        {product.featured && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="bg-yellow-500 text-black text-xs">
              ⭐ {t('admin.products.featured')}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-base leading-tight line-clamp-2" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
          {product.description && variant !== "transaction" && variant !== "reference" && (
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-product-description-${product.id}`}>
              {product.description}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span 
              className={variant === "reference" ? "text-2xl font-bold text-primary" : "text-lg font-bold text-primary"} 
              data-testid={`text-product-price-${product.id}`}
            >
              {formatPrice(product.price)}
            </span>
            {variant === "management" && product.cost && (
              <span className="text-sm text-muted-foreground" data-testid={`text-product-cost-${product.id}`}>
                {t('admin.products.cost')}: {formatPrice(product.cost)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs" data-testid={`badge-category-${product.id}`}>
              {categoryTranslation}
            </Badge>
            {product.productCode && variant === "management" && (
              <Badge variant="outline" className="text-xs" data-testid={`badge-code-${product.id}`}>
                {product.productCode}
              </Badge>
            )}
            {!product.available && (
              <Badge variant="destructive" className="text-xs">
                {t('admin.products.unavailable')}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      {/* Actions Footer - Only shown for non-reference variants */}
      {variant !== "reference" && (
        <CardFooter className="pt-3 border-t gap-2">
          {variant === "management" && (
            <>
              <Button
                onClick={() => onEdit?.(product)}
                variant="outline"
                size="sm"
                className="flex-1"
                data-testid={`button-edit-product-${product.id}`}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('common.edit')}
              </Button>
              <Button
                onClick={() => onDelete?.(product)}
                variant="outline"
                size="sm"
                data-testid={`button-delete-product-${product.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {variant === "transaction" && product.available && (
            <Button
              onClick={() => onAddToCart?.(product)}
              variant="default"
              size="sm"
              className="w-full"
              data-testid={`button-add-cart-${product.id}`}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {t('barista.addToCart')}
            </Button>
          )}
          
          {variant === "browse" && (
            <Button
              onClick={() => onView?.(product)}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid={`button-view-product-${product.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              {t('customer.viewDetails')}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
