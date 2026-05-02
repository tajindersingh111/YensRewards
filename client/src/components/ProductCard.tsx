import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ShoppingCart, Eye, Camera } from "lucide-react";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: Product;
  variant?: "management" | "transaction" | "browse" | "reference";
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  onView?: (product: Product) => void;
  onQuickPhoto?: (product: Product) => void;
}

export function ProductCard({
  product,
  variant = "browse",
  onEdit,
  onDelete,
  onAddToCart,
  onView,
  onQuickPhoto,
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
      case "new":      return "default";
      case "popular":  return "secondary";
      case "limited":  return "destructive";
      case "sale":     return "outline";
      default:         return "secondary";
    }
  };

  return (
    <Card className={`overflow-hidden hover-elevate h-full flex flex-col ${product.promoFocus ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`} data-testid={`card-product-${product.id}`}>
      {/* Image Container - Fixed Aspect Ratio */}
      <div className="relative w-full bg-muted" style={{ paddingBottom: "75%" }}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain"
            data-testid={`img-product-${product.id}`}
          />
        ) : variant === "management" && onQuickPhoto ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickPhoto(product); }}
            className="absolute inset-0 flex flex-col items-center justify-center w-full bg-muted/60 hover:bg-muted transition-colors cursor-pointer group"
            data-testid={`button-quick-photo-${product.id}`}
          >
            <Camera className="w-7 h-7 text-muted-foreground group-hover:text-foreground transition-colors mb-1" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">Add Photo</span>
          </button>
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
              {t('admin.products.featured')}
            </Badge>
          </div>
        )}

        {/* Promo Focus Indicator */}
        {product.promoFocus && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="default" className="bg-orange-500 text-white text-xs animate-pulse" data-testid={`badge-promo-focus-${product.id}`}>
              {t('admin.products.promoFocus')}
            </Badge>
          </div>
        )}

        {/* Camera overlay for products that already have a photo (management) */}
        {product.imageUrl && variant === "management" && onQuickPhoto && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickPhoto(product); }}
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/50 hover:bg-black/70 transition-colors"
            data-testid={`button-change-photo-${product.id}`}
            title="Change photo"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
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
              className={variant === "reference" ? "text-2xl font-bold text-chart-1" : "text-lg font-bold text-primary"} 
              data-testid={`text-product-price-${product.id}`}
            >
              {formatPrice(product.price)}
            </span>
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
