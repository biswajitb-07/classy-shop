import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGetSiteContentQuery } from "../../features/api/contentApi.js";

const AUTO_PLAY_INTERVAL = 5000;
const PROMO_AUTO_PLAY_INTERVAL = 3000;

const ScrollReveal = ({ children }) => {
  const ref = useRef(null);
  const isInView = useInView(ref);

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
  const navigate = useNavigate();
  const { data } = useGetSiteContentQuery();
  const slides = data?.content?.heroSlides || [];
  const promoSlides = data?.content?.promoBanners || [];
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const promoTouchStartX = useRef(0);
  const promoTouchEndX = useRef(0);

  const nextSlide = () =>
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () =>
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  const nextPromoSlide = () =>
    setPromoCurrent((prev) =>
      prev === promoSlides.length - 1 ? 0 : prev + 1
    );
  const prevPromoSlide = () =>
    setPromoCurrent((prev) =>
      prev === 0 ? promoSlides.length - 1 : prev - 1
    );

  useEffect(() => {
    if (!slides.length) return undefined;
    const timer = setInterval(nextSlide, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (!promoSlides.length) return undefined;
    const timer = setInterval(nextPromoSlide, PROMO_AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [promoSlides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [current, slides.length]);

  useEffect(() => {
    if (promoCurrent >= promoSlides.length) setPromoCurrent(0);
  }, [promoCurrent, promoSlides.length]);

  const openLink = (link) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      window.location.assign(link);
      return;
    }
    navigate(link);
  };

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

  if (!slides.length && !promoSlides.length) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div
        className={`grid grid-cols-1 gap-4 lg:gap-8 ${
          slides.length && promoSlides.length ? "lg:grid-cols-2" : ""
        }`}
      >
        {slides.length ? (
          <ScrollReveal>
          <div
            className="relative w-full overflow-hidden rounded-xl"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={slides[current]?._id || current}
                  onClick={() => openLink(slides[current]?.link)}
                  className={`min-w-full h-[20rem] sm:h-[24rem] md:h-[28rem] lg:h-[33.4rem] relative overflow-hidden group ${
                    slides[current]?.link ? "cursor-pointer" : "cursor-default"
                  }`}
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <motion.img
                    src={slides[current]?.image}
                    alt={slides[current]?.alt || `Slide ${current + 1}`}
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
                      {slides[current]?.eyebrow}
                    </motion.p>
                    <motion.h1
                      className="text-sm sm:text-base md:text-xl lg:text-3xl font-bold text-black text-right"
                      variants={textVariants}
                      custom={1}
                    >
                      {slides[current]?.title}
                      {slides[current]?.subtitle ? (
                        <>
                          <br />
                          {slides[current]?.subtitle}
                        </>
                      ) : null}
                    </motion.h1>
                    <motion.p
                      className="text-lg sm:text-xl md:text-2xl font-medium text-black"
                      variants={textVariants}
                      custom={2}
                    >
                      Starting At Only{" "}
                      <span className="font-bold pl-1 text-red-500">
                        {slides[current]?.priceLabel}
                      </span>
                    </motion.p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {slides.map((slide, idx) => (
                <motion.button
                  key={slide._id || idx}
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
        ) : null}

        {promoSlides.length ? (
          <ScrollReveal>
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div
              className="relative w-full overflow-hidden rounded-xl lg:hidden"
              onTouchStart={handlePromoTouchStart}
              onTouchMove={handlePromoTouchMove}
              onTouchEnd={handlePromoTouchEnd}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={promoSlides[promoCurrent]?._id || promoCurrent}
                  className="min-w-full"
                  variants={slideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <div
                    onClick={() => openLink(promoSlides[promoCurrent]?.link)}
                    className={`relative overflow-hidden rounded-xl ${
                      promoSlides[promoCurrent]?.link
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <motion.img
                      src={promoSlides[promoCurrent]?.image}
                      className="w-full h-[16rem] sm:h-[18rem] object-cover"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      alt={promoSlides[promoCurrent]?.alt}
                      loading="lazy"
                    />
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-${
                        promoSlides[promoCurrent]?.overlayDirection === "right"
                          ? "r"
                          : "l"
                      } from-black/50 to-transparent p-4 sm:p-6 flex flex-col ${
                        promoSlides[promoCurrent]?.textAlign === "right"
                          ? "items-end !text-left"
                          : "items-start text-right"
                      } justify-center`}
                      initial="hidden"
                      animate="visible"
                      variants={textVariants}
                    >
                      <motion.h3
                        className="text-sm sm:text-lg md:text-xl font-semibold text-black"
                        variants={textVariants}
                        custom={0}
                      >
                        {promoSlides[promoCurrent]?.title}
                      </motion.h3>
                      <motion.p
                        className="text-sm sm:text-lg md:text-xl font-bold text-orange-500 mt-1"
                        variants={textVariants}
                        custom={1}
                      >
                        {promoSlides[promoCurrent]?.price}
                      </motion.p>
                      <motion.button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openLink(promoSlides[promoCurrent]?.link);
                        }}
                        className="mt-2 text-xs sm:text-sm md:text-base font-medium text-black underline"
                        whileHover={{ x: 5, color: "#f4d03f" }}
                        transition={{ duration: 0.2 }}
                      >
                        {promoSlides[promoCurrent]?.ctaLabel || "Show More"}
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {promoSlides.map((slide, idx) => (
                  <motion.button
                    key={slide._id || idx}
                    className="w-2 h-2 rounded-full"
                    variants={dotVariants}
                    animate={promoCurrent === idx ? "active" : "inactive"}
                    onClick={() => setPromoCurrent(idx)}
                    aria-label={`Go to promo slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="hidden lg:grid lg:grid-cols-1 gap-4 sm:gap-6">
              {promoSlides.slice(0, 2).map((promo, index) => (
                <motion.div
                  key={promo._id || index}
                  onClick={() => openLink(promo.link)}
                  className={`relative overflow-hidden rounded-xl ${
                    promo.link ? "cursor-pointer" : "cursor-default"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.img
                    src={promo.image}
                    className="w-full h-[16rem] object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    alt={promo.alt}
                    loading="lazy"
                  />
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-${
                      promo.overlayDirection === "right" ? "r" : "l"
                    } from-black/50 to-transparent p-4 sm:p-6 flex flex-col justify-center ${
                      promo.textAlign === "right"
                        ? "items-end !text-left"
                        : "items-start text-right"
                    }`}
                    initial="hidden"
                    whileInView="visible"
                    variants={textVariants}
                  >
                    <motion.h3
                      className="text-sm sm:text-lg md:text-xl lg:text-2xl font-semibold text-black"
                      variants={textVariants}
                      custom={0}
                    >
                      {promo.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm sm:text-lg md:text-xl font-bold text-orange-500 mt-1"
                      variants={textVariants}
                      custom={1}
                    >
                      {promo.price}
                    </motion.p>
                    <motion.button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openLink(promo.link);
                      }}
                      className="mt-2 text-xs sm:text-sm md:text-base font-medium text-black underline"
                      whileHover={{ x: 5, color: "#f4d03f" }}
                      transition={{ duration: 0.2 }}
                    >
                      {promo.ctaLabel || "Show More"}
                    </motion.button>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
          </ScrollReveal>
        ) : null}
      </div>
    </div>
  );
};

export default MidBanner;
