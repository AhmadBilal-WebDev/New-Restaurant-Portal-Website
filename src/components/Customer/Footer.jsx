import { UtensilsCrossed, Phone, Mail, MapPin, Clock, Instagram, Facebook, Twitter, ChevronRight } from "lucide-react";
const Footer = ({ onNavigate }) => {
  return <footer className="bg-[#191919] text-white pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {
    /* Main 4-Column Grid */
  }
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-neutral-800">
          
          {
    /* Column 1: Brand & Bio (4 cols) */
  }
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#E51B23] flex items-center justify-center text-white">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white font-['Outfit']">
                Bite<span className="text-[#E51B23]"> & Burger</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
              Crafting premium double smashed Angus burgers, crispy hand-breaded chicken sandwiches, and seasoned fries. Prepared hot to order and delivered in minutes.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
    href="#instagram"
    aria-label="Instagram"
    className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-[#E51B23] text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
  >
                <Instagram className="w-4 h-4" />
              </a>
              <a
    href="#facebook"
    aria-label="Facebook"
    className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-[#E51B23] text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
  >
                <Facebook className="w-4 h-4" />
              </a>
              <a
    href="#twitter"
    aria-label="Twitter"
    className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-[#E51B23] text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
  >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {
    /* Column 2: Quick Links (2.5 cols) */
  }
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-['Outfit']">
              Quick Menu
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-400">
              {[
    { label: "Smash Burgers", id: "menu-section" },
    { label: "Crispy Chicken", id: "menu-section" },
    { label: "Seasoned Fries & Sides", id: "menu-section" },
    { label: "Thick Hand-Spun Shakes", id: "menu-section" },
    { label: "Weekly Combo Deals", id: "deals-section" }
  ].map((item, idx) => <li key={idx}>
                  <button
    onClick={() => onNavigate(item.id)}
    className="hover:text-[#E51B23] transition-colors flex items-center gap-1 text-left"
  >
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{item.label}</span>
                  </button>
                </li>)}
            </ul>
          </div>

          {
    /* Column 3: Company & Information (2.5 cols) */
  }
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-['Outfit']">
              Company
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-400">
              {[
    { label: "Our Story", id: "brand-story-section" },
    { label: "How It Works", id: "how-it-works-section" },
    { label: "Customer Reviews", id: "reviews-section" },
    { label: "Delivery Areas", id: "hero-section" },
    { label: "Nutritional Info", id: "menu-section" }
  ].map((item, idx) => <li key={idx}>
                  <button
    onClick={() => onNavigate(item.id)}
    className="hover:text-[#E51B23] transition-colors flex items-center gap-1 text-left"
  >
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                    <span>{item.label}</span>
                  </button>
                </li>)}
            </ul>
          </div>

          {
    /* Column 4: Contact & Hours (3 cols) */
  }
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-sm font-black uppercase tracking-wider text-white font-['Outfit']">
              Visit & Contact
            </h4>
            <div className="space-y-2.5 text-xs sm:text-sm text-neutral-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E51B23] flex-shrink-0 mt-0.5" />
                <span>101 Gourmet Avenue, Food District, Suite 400</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#E51B23] flex-shrink-0" />
                <span>(555) 248-3663</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#E51B23] flex-shrink-0" />
                <span>orders@biteandburger.com</span>
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Clock className="w-4 h-4 text-[#F5B82E] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-semibold">Kitchen Hours:</div>
                  <div>Mon–Sun: 10:30 AM – 11:30 PM</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {
    /* Bottom Bar with Legal & Copyright */
  }
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © 2026 Bite & Burger. Made with great food and good vibes.
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span>•</span>
            <a href="#delivery-info" className="hover:text-white transition-colors">Delivery Information</a>
            <span>•</span>
            <a href="#hostinger" className="text-neutral-400 font-semibold">Ready for Hostinger Deployment</a>
          </div>
        </div>

      </div>
    </footer>;
};
export {
  Footer
};
