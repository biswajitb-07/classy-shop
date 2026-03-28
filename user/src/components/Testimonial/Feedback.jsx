import { useRef } from "react";
import {
  FaQuoteLeft,
  FaUserCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useStableSiteContent } from "../../hooks/useStableSiteContent.js";

const Feedback = () => {
  const productScrollRef = useRef(null);
  const { content } = useStableSiteContent();
  const testimonials = content?.testimonials || [];

  const scroll = (ref, direction) => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.6;
      ref.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!testimonials.length) return null;

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="mb-3 w-full flex items-start md:items-center md:justify-between justify-center">
        <h1 className="text-xl md:text-2xl font-medium text-black pl-2">
          What Our Clients Say
        </h1>
        <div className="hidden md:flex items-center pr-6 gap-3">
          <button
            onClick={() => scroll(productScrollRef, "left")}
            className="p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-150 ease-in-out"
          >
            <FaChevronLeft className="text-[15px]" />
          </button>
          <button
            onClick={() => scroll(productScrollRef, "right")}
            className="p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-150 ease-in-out"
          >
            <FaChevronRight className="text-[15px]" />
          </button>
        </div>
      </div>

      <div
        ref={productScrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        <div className="flex flex-row gap-5">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial._id || index}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col snap-start min-w-[300px] md:min-w-[400px]"
            >
              <div className="flex-grow">
                <FaQuoteLeft className="text-gray-300 text-2xl mb-4" />
                <p className="text-gray-600 mb-6">{testimonial.content}</p>
              </div>
              <div className="flex items-center mt-auto">
                <div className="mr-4">
                  <FaUserCircle className="text-4xl text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {testimonial.name}
                  </h3>
                  <p className="text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Feedback;
