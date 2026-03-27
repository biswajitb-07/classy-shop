import { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  "./slide/slide-1.jpg",
  "./slide/slide-2.jpg",
  "./slide/slide-3.jpg",
  "./slide/slide-4.jpg",
  "./slide/slide-5.jpg",
  "./slide/slide-6.jpg",
];

const AUTO_PLAY_INTERVAL = 5000;

const HomeSlider = () => {
  const [current, setCurrent] = useState(0);
  const [arrowIcon, setArrowIcon] = useState(false);

  const toggleArrowIcon = () => {
    setArrowIcon(!arrowIcon);
  };

  const nextSlide = () =>
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));

  const prevSlide = () =>
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  useEffect(() => {
    const timer = setInterval(nextSlide, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const arrowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  };

  const dotVariants = {
    active: {
      scale: 1.5,
      backgroundColor: "#ef4444",
      transition: { duration: 0.2 },
    },
    inactive: {
      scale: 1,
      backgroundColor: "#d1d5db",
      transition: { duration: 0.2 },
    },
  };

  return (
    <div
      onMouseEnter={toggleArrowIcon}
      onMouseLeave={toggleArrowIcon}
      className="relative w-full my-2 md:my-4 lg:my-3 overflow-hidden rounded-lg shadow-lg"
    >
      {/* Slides container */}
      <div className="relative flex w-full h-full">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={current}
            className="min-w-full h-full"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <img
              src={slides[current]}
              alt={`slide-${current}`}
              className="w-full h-auto block"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Left arrow */}
      <motion.button
        onClick={prevSlide}
        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white text-black p-2 rounded-full z-10 cursor-pointer hover:bg-red-500 hover:text-white"
        variants={arrowVariants}
        initial="hidden"
        animate={arrowIcon ? "visible" : "hidden"}
      >
        <FaChevronLeft className="text-[15px] md:text-[22px] lg:text-[28px]" />
      </motion.button>

      {/* Right arrow */}
      <motion.button
        onClick={nextSlide}
        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white text-black p-2 rounded-full z-10 cursor-pointer hover:bg-red-500 hover:text-white"
        variants={arrowVariants}
        initial="hidden"
        animate={arrowIcon ? "visible" : "hidden"}
      >
        <FaChevronRight className="text-[15px] md:text-[22px] lg:text-[28px]" />
      </motion.button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {slides.map((_, idx) => (
          <motion.button
            key={idx}
            onClick={() => setCurrent(idx)}
            className="w-2 h-2 rounded-full"
            variants={dotVariants}
            animate={idx === current ? "active" : "inactive"}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeSlider;
