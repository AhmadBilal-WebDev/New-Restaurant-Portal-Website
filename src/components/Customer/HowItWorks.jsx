import { Utensils, Sliders, Smile } from "lucide-react";
const HowItWorks = ({ onStartOrder }) => {
  const steps = [
    {
      step: "01",
      title: "Choose Your Meal",
      description: "Explore our chef-crafted smash burgers, crispy fried chicken, hand-cut golden fries, and thick shakes.",
      icon: Utensils,
      color: "#E51B23"
    },
    {
      step: "02",
      title: "Customize Your Order",
      description: "Select your toasted brioche or artisan bun, melted cheddar or swiss, and load up with bacon or jalapenos.",
      icon: Sliders,
      color: "#F5B82E"
    },
    {
      step: "03",
      title: "Enjoy Every Bite",
      description: "Track your driver live from grill to doorstep. Unpack hot, crunchy, fresh food delivered in under 25 minutes.",
      icon: Smile,
      color: "#2E9B5B"
    }
  ];
  return <section id="how-it-works-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20">
      {
    /* Heading */
  }
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-black uppercase tracking-wider text-[#E51B23] bg-[#E51B23]/10 px-3.5 py-1.5 rounded-full inline-block mb-3">
          Seamless Ordering
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-[#191919] tracking-tight font-['Outfit']">
          How Bite & Burger Works
        </h2>
        <p className="text-sm sm:text-base text-[#777777] font-medium mt-2">
          From screen tap to sizzling bite in three effortless steps.
        </p>
      </div>

      {
    /* 3 Step Cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
        {steps.map((item, idx) => {
    const Icon = item.icon;
    return <div
      key={item.step}
      className="relative bg-white rounded-3xl p-6 sm:p-8 border border-[#EEE7DC] shadow-soft-card hover:shadow-soft-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start"
    >
              {
      /* Number and Icon Header */
    }
              <div className="flex items-center justify-between w-full mb-6">
                <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm"
      style={{ backgroundColor: item.color }}
    >
                  <Icon className="w-6 h-6" />
                </div>

                <span className="text-3xl font-black text-neutral-200 font-['Outfit'] tracking-wider">
                  {item.step}
                </span>
              </div>

              <h3 className="text-xl font-black text-[#191919] font-['Outfit'] mb-2">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-[#777777] leading-relaxed mb-6">
                {item.description}
              </p>

              <div className="mt-auto flex items-center gap-1.5 text-xs font-bold text-[#E51B23]">
                <span>Step {idx + 1} of 3</span>
              </div>
            </div>;
  })}
      </div>
    </section>;
};
export {
  HowItWorks
};
