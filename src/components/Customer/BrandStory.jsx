import { Sparkles, Flame, Clock, CheckCircle2 } from "lucide-react";
const BrandStory = () => {
  return <section
    id="brand-story-section"
    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 scroll-mt-20"
  >
      <div className="bg-[#191919] text-white rounded-3xl sm:rounded-[36px] overflow-hidden p-6 sm:p-10 lg:p-14 shadow-2xl relative">
        {
    /* Background ambient glow */
  }
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E51B23]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#F5B82E]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {
    /* Left Text Narrative (7 cols) */
  }
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="text-xs font-black uppercase tracking-wider text-[#F5B82E] bg-white/10 px-3.5 py-1.5 rounded-full mb-4">
              Our Passion & Craft
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4 font-['Outfit']">
              Good Food. <br className="hidden sm:inline" />
              <span className="text-[#E51B23]">No Shortcuts.</span>
            </h2>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal mb-8 max-w-xl">
              We started Bite & Burger with a simple obsession: fast food doesn’t have to compromise on quality. Every single burger begins with premium 100% Angus beef smashed hard on a blazing 450° chrome flat-top for that irresistible caramelized crust.
            </p>

            {
    /* 3 Value Pillars */
  }
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#E51B23]/20 text-[#E51B23] flex items-center justify-center mb-2.5">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">100% Angus</h4>
                <p className="text-xs text-neutral-400 leading-normal">
                  Fresh beef, never frozen. Smashed crispy to order.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#F5B82E]/20 text-[#F5B82E] flex items-center justify-center mb-2.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Buttered Brioche</h4>
                <p className="text-xs text-neutral-400 leading-normal">
                  Artisan buns toasted in rich butter for every bite.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#2E9B5B]/20 text-[#2E9B5B] flex items-center justify-center mb-2.5">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Under 25 Mins</h4>
                <p className="text-xs text-neutral-400 leading-normal">
                  Thermal insulated bags keep fries crisp & burgers steaming.
                </p>
              </div>
            </div>

            {
    /* Quick Metrics Bar */
  }
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/10 w-full text-xs">
              <div>
                <span className="text-xl font-black text-white block font-['Outfit']">12,000+</span>
                <span className="text-neutral-400">Happy Local Foodies</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-xl font-black text-[#F5B82E] block font-['Outfit']">4.9 ★</span>
                <span className="text-neutral-400">Average Review Score</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-xl font-black text-[#E51B23] block font-['Outfit']">100%</span>
                <span className="text-neutral-400">Quality Guarantee</span>
              </div>
            </div>
          </div>

          {
    /* Right Image Composition with Layered Cards (6 cols) */
  }
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
              <img
    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
    alt="Bite and Burger chefs grilling fresh smash burgers"
    referrerPolicy="no-referrer"
    className="w-full h-full object-cover"
  />
            </div>

            {
    /* Floating Layered Card 1: Fresh Ingredients */
  }
            <div className="absolute -top-4 -left-3 sm:-left-6 bg-white text-[#191919] p-3.5 sm:p-4 rounded-2xl shadow-xl border border-[#E9E2D8] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2E9B5B]/15 text-[#2E9B5B] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-[#191919]">Fresh Ingredients</div>
                <div className="text-[11px] text-[#777777]">Farm-fresh lettuce, ripe tomatoes</div>
              </div>
            </div>

            {
    /* Floating Layered Card 2: Fast Delivery */
  }
            <div className="absolute -bottom-4 -right-3 sm:-right-6 bg-[#E51B23] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black">Piping Hot Delivery</div>
                <div className="text-[11px] text-white/80">Average doorstep arrival 20 mins</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>;
};
export {
  BrandStory
};
