import { useRef, useState } from "react";
import {
  FaQuoteLeft,
  FaUserCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

const testimonials = [
  {
    name: "Patrick Goodman",
    role: "Manager",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text randomised words which don't look even slightly believable.",
  },
  {
    name: "Lules Charls",
    role: "Helper",
    content:
      "Galley of type and scrambled it to make a type specimen book. Lorem Ipsum is simply dummy text of the printing and typesetting i predefined chunks as necessary, making this the first true generator.",
  },
  {
    name: "Jacob Goeckno",
    role: "Unit Manager",
    content:
      "Letraset sheets containing Lorem with desktop publishing printer took a galley Lorem Ipsum is simply dummy text of the printing model sentence structures, to generate Lorem Ipsum which looks",
  },
  {
    name: "Patrick Goodman",
    role: "Manager",
    content:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text randomised words which don't look even slightly believable.",
  },
  {
    name: "Lules Charls",
    role: "Helper",
    content:
      "Galley of type and scrambled it to make a type specimen book. Lorem Ipsum is simply dummy text of the printing and typesetting i predefined chunks as necessary, making this the first true generator.",
  },
  {
    name: "Jacob Goeckno",
    role: "Unit Manager",
    content:
      "Letraset sheets containing Lorem with desktop publishing printer took a galley Lorem Ipsum is simply dummy text of the printing model sentence structures, to generate Lorem Ipsum which looks",
  },
];

const Feedback = () => {
  const productScrollRef = useRef(null);

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

  return (
    <section className="container mx-auto px-4 py-5">
      <div className="mb-3 w-full flex items-start md:items-center md:justify-between justify-center">
        <h1 className="text-xl md:text-2xl font-medium text-black pl-2">
          What Our Clients Say
        </h1>
        <div className="hidden md:flex items-center pr-6 gap-3">
          <div>
            <button
              onClick={() => scroll(productScrollRef, "left")}
              className={`p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-150 ease-in-out`}
            >
              <FaChevronLeft className="text-[15px]" />
            </button>
          </div>
          <div className="hidden md:block">
            <button
              onClick={() => scroll(productScrollRef, "right")}
              className={`p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-150 ease-in-out`}
            >
              <FaChevronRight className="text-[15px]" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={productScrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        <div className="flex flex-row gap-5">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
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
