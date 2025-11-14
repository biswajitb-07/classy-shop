import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

const BannerBox = () => {
  const containerRef = useRef();
  const controls = useAnimation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start("visible");
        } else {
          controls.start("hidden");
        }
      },
      { threshold: 0.2 }
    );

    const currentRef = containerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [controls]);

  const cardVariants = {
    hidden: (i) => ({
      opacity: 0,
      y: 60,
      scale: 0.92,
      transition: { delay: i * 0.15, duration: 0.9, ease: "easeOut" },
    }),
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: i * 0.15, duration: 0.9, ease: "easeOut" },
    }),
  };

  const textLineVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.4 + i * 0.1, duration: 0.7, ease: "easeOut" },
    }),
  };

  const priceVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { delay: 0.7, duration: 0.7 },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { delay: 0.85, duration: 0.7 } },
  };

  const cards = [
    {
      img: "./banner/banner-1.jpg",
      alt: "Women's products",
      pos: "right",
      text: ["Buy women", "products with low", "price"],
      price: "₹999",
    },
    {
      img: "./banner/banner-2.png",
      alt: "Men's bags",
      pos: "left",
      text: ["Buy Men's Bags", "with low price"],
      price: "₹900",
    },
    {
      img: "./banner/banner-3.jpg",
      alt: "Apple iPhone",
      pos: "left",
      text: ["Buy Apple Iphone"],
      price: "₹45000",
    },
    {
      img: "./banner/banner-4.jpg",
      alt: "Men's footwear",
      pos: "right",
      text: ["Buy Men's", "Footwear with", "low price"],
      price: "₹1500",
    },
  ];

  return (
    <div ref={containerRef} className="container px-4 py-10 mx-auto">
      <div className="four-div grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate={controls}
            variants={cardVariants}
            className="h-full relative group overflow-hidden cursor-pointer rounded-xl shadow-[0_10px_20px_rgba(0,_0,_255,_0.4)]"
          >
            <motion.img
              src={c.img}
              alt={c.alt}
              className="h-full w-full object-cover md:object-contain"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.5 }}
            />
            <div
              className={`absolute top-5 ${
                c.pos === "right" ? "right-3 md:right-6" : "left-3 md:left-6"
              } flex flex-col gap-2 sm:gap-3`}
            >
              {c.text.map((line, idx) => (
                <motion.p
                  key={idx}
                  custom={idx}
                  initial="hidden"
                  animate={controls}
                  variants={textLineVariants}
                  className={`text-[12px] md:text-xl font-semibold leading-tight ${
                    c.pos === "left" ? "pl-0 md:pl-2" : "pr-0 md:pr-2"
                  }`}
                >
                  {line}
                </motion.p>
              ))}
              <motion.p
                initial="hidden"
                animate={controls}
                variants={priceVariants}
                className={`font-bold text-[15px] md:text-xl text-orange-600 ${
                  c.pos === "left" ? "pl-0 md:pl-2" : "pr-0 md:pr-2"
                }`}
              >
                {c.price}
              </motion.p>
              <motion.button
                initial="hidden"
                animate={controls}
                variants={buttonVariants}
                whileHover={{ color: "#f97316", scale: 1.05 }}
                className={`text-left font-medium text-[9px] md:text-xl underline cursor-pointer ${
                  c.pos === "left" ? "pl-0 md:pl-2" : "pr-0 md:pr-2"
                }`}
              >
                show more
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BannerBox;
