import { useRef } from "react";
import { useRestaurant } from '@/contexts/RestaurantContext';
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroMealImg from '@/assets/images/hero_burger_meal_1789195599245.jpg';
import { categoryTagLabel } from '@/shared/lib/catalogApi';
const CategoryNav = ({
  selectedCategory,
  onSelectCategory
}) => {
  const { categories } = useRestaurant();
  const scrollContainerRef = useRef(null);
  const activeCategories = categories.filter((c) => c.isActive !== false);
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };
  return <section id="categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#191919] font-['Outfit']">
            Explore Categories
          </h2>
          <p className="text-xs sm:text-sm text-[#777777] font-medium">
            Tap to jump to your favorite bites
          </p>
        </div>

        {
    /* Scroll helper controls for desktop/tablet */
  }
        <div className="hidden sm:flex items-center gap-1.5">
          <button
    onClick={() => scroll("left")}
    className="w-8 h-8 rounded-full border border-[#E9E2D8] bg-white flex items-center justify-center text-[#191919] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors shadow-xs cursor-pointer"
    aria-label="Scroll categories left"
  >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
    onClick={() => scroll("right")}
    className="w-8 h-8 rounded-full border border-[#E9E2D8] bg-white flex items-center justify-center text-[#191919] hover:border-[#E51B23] hover:text-[#E51B23] transition-colors shadow-xs cursor-pointer"
    aria-label="Scroll categories right"
  >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {
    /* Category Horizontal Scroll Row */
  }
      <div
    ref={scrollContainerRef}
    className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth"
  >
        {activeCategories.map((category) => {
    const isActive = selectedCategory === category.id;
    return <button
      key={category.id}
      onClick={() => onSelectCategory(category.id)}
      className={`flex-shrink-0 group flex flex-col items-center p-3 rounded-2xl transition-all duration-200 focus:outline-none cursor-pointer ${isActive ? "bg-white shadow-soft-card border-2 border-[#E51B23] -translate-y-1" : "bg-white/80 hover:bg-white border border-[#E9E2D8] hover:-translate-y-0.5 hover:shadow-sm"}`}
      style={{ minWidth: "100px" }}
    >
              {
      /* Circular / Rounded Image Container */
    }
              <div
      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden p-1 transition-all duration-200 ${isActive ? "ring-2 ring-[#E51B23] ring-offset-2 bg-[#FFF9EF]" : "group-hover:ring-2 group-hover:ring-[#F5B82E] bg-[#F7F1E7]"}`}
    >
                <img
      src={category.image || heroMealImg.src}
      alt={category.name}
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(heroMealImg.src)) {
          event.currentTarget.src = heroMealImg.src;
        }
      }}
      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
    />
              </div>

              {
      /* Label */
    }
              <span
      className={`mt-2.5 text-xs sm:text-sm font-bold tracking-tight transition-colors whitespace-nowrap ${isActive ? "text-[#E51B23]" : "text-[#191919] group-hover:text-[#E51B23]"}`}
    >
                {category.name}
              </span>
              {category.tags?.[0] && <span className="mt-1 max-w-full truncate rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[9px] font-bold text-[#C94312]">
                  {categoryTagLabel(category.tags[0])}
                </span>}

              {
      /* Item Count */
    }
              <span className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                {category.count || "Popular"} items
              </span>
            </button>;
  })}
      </div>
    </section>;
};
export {
  CategoryNav
};
