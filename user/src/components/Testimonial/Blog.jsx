import { useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaUserCircle } from "react-icons/fa";
import { CiClock2 } from "react-icons/ci";

const roomData = [
  {
    name: "Living Room",
    role: "Interior Design",
    content:
      "Nullam ullamcorper ornare molestie. Suspendisse posuere, diam in bibendum lobortis, turpis ipsum aliquam...",
    date: "5 APRIL, 2023",
    image: "./blog/blog-1.jpg",
  },
  {
    name: "Living Room",
    role: "Interior Design",
    content:
      "Nullam ullamcorper ornare molestie. Suspendisse posuere, diam in bibendum lobortis, turpis ipsum aliquam...",
    date: "5 APRIL, 2023",
    image: "./blog/blog-2.jpg",
  },
  {
    name: "Living Room",
    role: "Interior Design",
    content:
      "Nullam ullamcorper ornare molestie. Suspendisse posuere, diam in bibendum lobortis, turpis ipsum aliquam...",
    date: "5 APRIL, 2023",
    image: "./blog/blog-3.jpg",
  },
  {
    name: "Living Room",
    role: "Interior Design",
    content:
      "Nullam ullamcorper ornare molestie. Suspendisse posuere, diam in bibendum lobortis, turpis ipsum aliquam...",
    date: "5 APRIL, 2023",
    image: "./blog/blog-4.jpg",
  },
  {
    name: "Living Room",
    role: "Interior Design",
    content:
      "Nullam ullamcorper ornare molestie. Suspendisse posuere, diam in bibendum lobortis, turpis ipsum aliquam...",
    date: "5 APRIL, 2023",
    image: "./blog/blog-5.jpg",
  },
];

const Blog = () => {
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
    <section className="container mx-auto px-4 py-10">
      <div className="mb-3 w-full flex items-start md:items-center md:justify-between justify-center">
        <h1 className="text-xl md:text-2xl font-semibold text-black pl-2">
          From The Blog
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

      {/* blog div */}
      <div
        ref={productScrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        <div className="flex flex-row gap-5">
          {roomData.map((room, index) => (
            <div
              key={index}
              className="bg-[#fff5f7] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col snap-start min-w-[300px] md:min-w-[400px]"
            >
              <div className="flex-grow">
                <img
                  src={room.image}
                  alt={`${room.name} Design`}
                  className="w-full h-48 object-cover rounded-t-lg mb-4"
                />
                <div className="flex items-center mb-4 gap-1.5">
                  <CiClock2 size={18} className="text-red-500" />
                  <span className="flex items-center pl-1 w-full h-8 text-red-500 rounded-full text-sm">
                    {room.date}
                  </span>
                </div>

                <div className="flex flex-col items-start gap-3 mt-auto">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {room.name}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">{room.content}</p>
                </div>
                <a
                  href="#"
                  className="text-red-500 text-xs font-semibold underline hover:no-underline transition"
                >
                  READ MORE
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
