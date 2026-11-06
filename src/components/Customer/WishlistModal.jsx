import { Heart, ShoppingBag, Trash2, X, ArrowRight } from "lucide-react";
import { useRestaurant } from '@/contexts/RestaurantContext';
const WishlistModal = ({
  isOpen,
  onClose,
  onSelectProduct,
  onQuickAdd,
  onExploreMenu
}) => {
  const { wishlist, products, toggleWishlist, clearWishlist, formatPrice } = useRestaurant();
  if (!isOpen) return null;
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));
  return <div
    id="wishlist-modal-backdrop"
    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    onClick={onClose}
  >
      <div
    id="wishlist-modal"
    onClick={(e) => e.stopPropagation()}
    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#EEE7DC] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
  >
        {
    /* Header */
  }
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#EEE7DC] bg-[#FFF9EF]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E51B23] text-white flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#191919] font-['Outfit'] flex items-center gap-2">
                My Saved Wishlist
                <span className="bg-[#E51B23]/10 text-[#E51B23] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {wishlistedProducts.length}
                </span>
              </h2>
              <p className="text-xs text-[#777777]">Your favorite burgers and combos in one place</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wishlistedProducts.length > 0 && <button
    type="button"
    onClick={clearWishlist}
    className="text-xs font-semibold text-neutral-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
    title="Remove all items"
  >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>}
            <button
    type="button"
    onClick={onClose}
    className="w-9 h-9 rounded-full bg-white border border-[#E9E2D8] hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
    aria-label="Close wishlist"
  >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {
    /* Wishlist Items Content */
  }
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-[#EEE7DC]/80">
          {wishlistedProducts.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {wishlistedProducts.map((product) => <div
    key={product.id}
    className="group relative bg-[#FCFBF8] border border-[#EEE7DC] rounded-2xl p-4 flex flex-col justify-between hover:border-[#E51B23]/40 hover:shadow-md transition-all duration-200"
  >
                  <div className="flex gap-3">
                    <div
    onClick={() => {
      onClose();
      onSelectProduct(product);
    }}
    className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 cursor-pointer relative"
  >
                      <img
    src={product.image}
    alt={product.name}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    referrerPolicy="no-referrer"
  />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4
    onClick={() => {
      onClose();
      onSelectProduct(product);
    }}
    className="font-bold text-sm text-[#191919] hover:text-[#E51B23] transition-colors cursor-pointer line-clamp-1 font-['Outfit']"
  >
                          {product.name}
                        </h4>
                        <button
    type="button"
    onClick={() => toggleWishlist(product.id)}
    className="text-[#E51B23] hover:text-neutral-400 transition-colors p-0.5 cursor-pointer"
    title="Remove from wishlist"
  >
                          <Heart className="w-4 h-4 fill-[#E51B23]" />
                        </button>
                      </div>

                      <p className="text-[11px] text-[#777777] line-clamp-2 mt-0.5">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-black text-sm text-[#E51B23]">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && <span className="text-xs text-neutral-400 line-through">
                            {formatPrice(product.originalPrice)}
                          </span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#EEE7DC] flex items-center justify-between gap-2">
                    <button
    type="button"
    onClick={() => {
      onClose();
      onSelectProduct(product);
    }}
    className="text-xs font-bold text-neutral-600 hover:text-[#191919] underline cursor-pointer"
  >
                      View Options
                    </button>
                    <button
    type="button"
    onClick={(e) => {
      onQuickAdd(product, e);
    }}
    className="bg-[#E51B23] hover:bg-[#B90F16] text-white text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
  >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  </div>
                </div>)}
            </div> : <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-[#FFF9EF] border border-[#E9E2D8] flex items-center justify-center text-[#E51B23] mx-auto mb-4">
                <Heart className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#191919] font-['Outfit'] mb-1">
                Your wishlist is empty
              </h3>
              <p className="text-xs sm:text-sm text-[#777777] max-w-sm mx-auto mb-6">
                Explore our menu and click the heart icon on any meal or deal to save your favorites here.
              </p>
              <button
    type="button"
    onClick={() => {
      onClose();
      onExploreMenu();
    }}
    className="inline-flex items-center gap-2 bg-[#E51B23] hover:bg-[#B90F16] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-full transition-colors cursor-pointer shadow-sm"
  >
                <span>Explore Menu Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>}
        </div>

        {
    /* Footer */
  }
        {wishlistedProducts.length > 0 && <div className="p-4 sm:p-5 border-t border-[#EEE7DC] bg-[#FFF9EF] flex items-center justify-between">
            <span className="text-xs text-[#777777]">
              Tip: Click on any item to customize buns, sauces, and drinks.
            </span>
            <button
    type="button"
    onClick={() => {
      onClose();
      onExploreMenu();
    }}
    className="text-xs font-bold text-[#E51B23] hover:underline flex items-center gap-1 cursor-pointer"
  >
              <span>Explore More Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>}
      </div>
    </div>;
};
export {
  WishlistModal
};
