import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const slides = ["./mid-banner/banner-1.jpg", "./mid-banner/banner-2.jpg"];
const promoSlides = ["./mid-banner/banner-3.jpg", "./mid-banner/banner-4.jpg"];
const AUTO_PLAY_INTERVAL = 5000;
const PROMO_AUTO_PLAY_INTERVAL = 3000;

// Helper component to reveal on scroll
const ScrollReveal = ({ children }) => {
  const ref = useRef(null);
  const isInView = useInView(ref); // Removed `once: true` to trigger animation on every view

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const MidBanner = () => {
  const [current, setCurrent] = useState(0);
  const [promoCurrent, setPromoCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const promoTouchStartX = useRef(0);
  const promoTouchEndX = useRef(0);

  const nextSlide = () =>
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () =>
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const nextPromoSlide = () =>
    setPromoCurrent((prev) => (prev === promoSlides.length - 1 ? 0 : prev + 1));
  const prevPromoSlide = () =>
    setPromoCurrent((prev) => (prev === 0 ? promoSlides.length - 1 : prev - 1));

  useEffect(() => {
    const timer = setInterval(nextSlide, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const promoTimer = setInterval(nextPromoSlide, PROMO_AUTO_PLAY_INTERVAL);
    return () => clearInterval(promoTimer);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
  };

  const handlePromoTouchStart = (e) => {
    promoTouchStartX.current = e.touches[0].clientX;
  };
  const handlePromoTouchMove = (e) => {
    promoTouchEndX.current = e.touches[0].clientX;
  };
  const handlePromoTouchEnd = () => {
    const diff = promoTouchStartX.current - promoTouchEndX.current;
    if (diff > 50) nextPromoSlide();
    else if (diff < -50) prevPromoSlide();
  };

  const slideVariants = {
    initial: { opacity: 0, x: 100 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      x: -100,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" },
    }),
  };

  const dotVariants = {
    active: {
      scale: 1.5,
      backgroundColor: "#f97316",
      transition: { duration: 0.2 },
    },
    inactive: {
      scale: 1,
      backgroundColor: "#d1d5db",
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 z-">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Promotion Slider 1 */}
        <ScrollReveal>
          <div className="relative w-full overflow-hidden rounded-xl">
            <div className="relative">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={current}
                  className="min-w-full h-[20rem] sm:h-[24rem] md:h-[28rem] lg:h-[33.4rem] relative overflow-hidden group cursor-pointer"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <motion.img
                    src={slides[current]}
                    alt={`Slide ${current + 1}`}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    loading="lazy"
                  />
                  <motion.div
                    className="absolute inset-0 flex flex-col items-end justify-center gap-4 pr-4 sm:pr-6"
                    initial="hidden"
                    animate="visible"
                    variants={textVariants}
                  >
                    <motion.p
                      className="text-lg sm:text-xl md:text-2xl font-bold text-orange-500"
                      variants={textVariants}
                      custom={0}
                    >
                      Big Saving days sale
                    </motion.p>
                    <motion.h1
                      className="text-sm sm:text-base md:text-xl lg:text-3xl font-bold text-black"
                      variants={textVariants}
                      custom={1}
                    >
                      {current === 1 ? (
                        <>
                          Apple iPhone <br /> 13 128 GB, Pink
                        </>
                      ) : (
                        <div className="text-xl">
                          Buy New Women Trend | Black <br />
                          Top Cotton Blend Top
                        </div>
                      )}
                    </motion.h1>
                    <motion.p
                      className="text-lg sm:text-xl md:text-2xl font-medium text-black"
                      variants={textVariants}
                      custom={2}
                    >
                      Starting At Only{" "}
                      <span className="font-bold pl-1 text-red-500">
                        {current === 1 ? "₹35,000.00" : "₹1,500.00"}
                      </span>
                    </motion.p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {slides.map((_, idx) => (
                <motion.button
                  key={idx}
                  className="w-2 h-2 rounded-full"
                  variants={dotVariants}
                  animate={current === idx ? "active" : "inactive"}
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Promo Slider Section */}
        <ScrollReveal>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Mobile Promo Slider */}
            <div
              className="relative w-full overflow-hidden rounded-xl lg:hidden"
              onTouchStart={handlePromoTouchStart}
              onTouchMove={handlePromoTouchMove}
              onTouchEnd={handlePromoTouchEnd}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={promoCurrent}
                  className="min-w-full"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <div className="relative overflow-hidden group cursor-pointer rounded-xl">
                    <motion.img
                      src={promoSlides[promoCurrent]}
                      className="w-full h-[16rem] sm:h-[18rem] object-cover"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      alt={
                        promoCurrent === 0 ? "Apple iPhone" : "Men's Footwear"
                      }
                      loading="lazy"
                    />
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-${
                        promoCurrent === 0 ? "r" : "l"
                      } from-black/50 to-transparent p-4 sm:p-6 flex flex-col ${
                        promoCurrent === 0 ? "items-end" : "items-start"
                      } justify-center ${
                        promoCurrent === 0 ? "!text-left" : "text-right"
                      }`}
                      initial="hidden"
                      animate="visible"
                      variants={textVariants}
                    >
                      <motion.h3
                        className="text-sm sm:text-lg md:text-xl font-semibold text-black"
                        variants={textVariants}
                        custom={0}
                      >
                        {promoCurrent === 0
                          ? "Buy Apple iPhone"
                          : "Buy Men's Footwear"}
                      </motion.h3>
                      <motion.p
                        className="text-sm sm:text-lg md:text-xl font-bold text-orange-500 mt-1"
                        variants={textVariants}
                        custom={1}
                      >
                        {promoCurrent === 0 ? "₹45,000" : "₹1,500"}
                      </motion.p>
                      <motion.button
                        className="mt-2 text-xs sm:text-sm md:text-base font-medium text-black underline"
                        whileHover={{ x: 5, color: "#f4d03f" }}
                        transition={{ duration: 0.2 }}
                      >
                        Show More
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {promoSlides.map((_, idx) => (
                  <motion.button
                    key={idx}
                    className="w-2 h-2 rounded-full"
                    variants={dotVariants}
                    animate={promoCurrent === idx ? "active" : "inactive"}
                    onClick={() => setPromoCurrent(idx)}
                    aria-label={`Go to promo slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Static Banners for LG Screens */}
            <div className="hidden lg:grid lg:grid-cols-1 gap-4 sm:gap-6">
              <motion.div
                className="relative overflow-hidden group cursor-pointer rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <motion.img
                  src="./mid-banner/banner-3.jpg"
                  className="w-full h-[16rem] object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  alt="Apple iPhone"
                  loading="lazy"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent p-4 sm:p-6 flex flex-col items-end justify-center !text-left"
                  initial="hidden"
                  whileInView="visible"
                  variants={textVariants}
                >
                  <motion.h3
                    className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold text-black"
                    variants={textVariants}
                    custom={0}
                  >
                    Buy Apple iPhone
                  </motion.h3>
                  <motion.p
                    className="text-sm sm:text-lg md:text-xl font-bold text-orange-500 mt-1"
                    variants={textVariants}
                    custom={1}
                  >
                    ₹45,000
                  </motion.p>
                  <motion.button
                    className="mt-2 text-xs sm:text-sm md:text-base font-medium text-black underline"
                    whileHover={{ x: 5, color: "#f4d03f" }}
                    transition={{ duration: 0.2 }}
                  >
                    Show More
                  </motion.button>
                </motion.div>
              </motion.div>

              <motion.div
                className="relative overflow-hidden group cursor-pointer rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <motion.img
                  src="./mid-banner/banner-4.jpg"
                  className="w-full h-[16rem] object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  alt="Men's Footwear"
                  loading="lazy"
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-l from-black/50 to-transparent p-4 sm:p-6 flex flex-col justify-center items-start text-right"
                  initial="hidden"
                  whileInView="visible"
                  variants={textVariants}
                >
                  <motion.h3
                    className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold text-black"
                    variants={textVariants}
                    custom={0}
                  >
                    Buy Men's Footwear
                  </motion.h3>
                  <motion.p
                    className="text-sm sm:text-lg md:text-xl font-bold text-orange-500 mt-1"
                    variants={textVariants}
                    custom={1}
                  >
                    ₹1,500
                  </motion.p>
                  <motion.button
                    className="mt-2 text-xs sm:text-sm md:text-base font-medium text-black underline"
                    whileHover={{ x: 5, color: "#f4d03f" }}
                    transition={{ duration: 0.2 }}
                  >
                    Show More
                  </motion.button>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default MidBanner;
