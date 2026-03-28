import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGetSiteContentQuery } from "../../features/api/contentApi.js";

const BannerBox = () => {
  const navigate = useNavigate();
  const { data } = useGetSiteContentQuery();
  const cards = data?.content?.bannerBoxes || [];

  const handleBannerClick = (link) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      window.location.assign(link);
      return;
    }
    navigate(link);
  };

  if (!cards.length) return null;

  return (
    <div className="container px-4 py-10 mx-auto">
      <div className="four-div grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card._id || index}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
            onClick={() => handleBannerClick(card.link)}
            className={`relative h-[10.75rem] sm:h-[12rem] lg:h-[14rem] group overflow-hidden rounded-xl shadow-[0_10px_20px_rgba(0,_0,_255,_0.18)] ${
              card.link ? "cursor-pointer" : "cursor-default"
            }`}
          >
            <motion.img
              src={card.image}
              alt={card.alt}
              className={`absolute inset-0 h-full w-full object-cover ${
                card.textPosition === "right" ? "object-left" : "object-right"
              }`}
              initial={{ scale: 1.03 }}
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.5 }}
            />
            <div
              className={`absolute top-4 ${
                card.textPosition === "right"
                  ? "right-4 md:right-5 items-end text-right"
                  : "left-4 md:left-5 items-start text-left"
              } z-10 flex max-w-[42%] flex-col gap-1.5 sm:gap-2`}
            >
              {(card.titleLines || []).map((line, idx) => (
                <motion.p
                  key={`${card._id || index}-${idx}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: 0.12 + idx * 0.06 }}
                  className={`text-[11px] sm:text-[12px] md:text-lg font-semibold leading-tight ${
                    card.textPosition === "left"
                      ? "pl-0"
                      : "pr-0"
                  }`}
                >
                  {line}
                </motion.p>
              ))}
              <motion.p
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.28 }}
                className={`font-bold text-[14px] sm:text-[15px] md:text-lg text-orange-600 ${
                  card.textPosition === "left"
                    ? "pl-0"
                    : "pr-0"
                }`}
              >
                {card.price}
              </motion.p>
              <motion.button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleBannerClick(card.link);
                }}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.34 }}
                whileHover={{ color: "#f97316", scale: 1.05 }}
                className={`font-medium text-[10px] sm:text-[11px] md:text-base underline ${
                  card.textPosition === "left"
                    ? "pl-0 text-left"
                    : "pr-0 text-right"
                } ${card.link ? "cursor-pointer" : "cursor-default"}`}
              >
                {card.ctaLabel || "show more"}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BannerBox;
