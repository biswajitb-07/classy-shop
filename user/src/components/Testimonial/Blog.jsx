import { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { CiClock2 } from "react-icons/ci";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useStableSiteContent } from "../../hooks/useStableSiteContent.js";

const Blog = () => {
  const productScrollRef = useRef(null);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { content } = useStableSiteContent();
  const blogPosts = content?.blogPosts || [];

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

  const openBlogLink = (link) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) {
      window.location.assign(link);
      return;
    }
    navigate(link);
  };

  if (!blogPosts.length) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="mb-3 w-full flex items-start md:items-center md:justify-between justify-center">
        <h1
          className={`text-xl md:text-2xl font-semibold pl-2 ${
            isDark ? "text-white" : "text-black"
          }`}
        >
          From The Blog
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
          {blogPosts.map((post, index) => (
            <div
              key={post._id || index}
              className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col snap-start min-w-[300px] md:min-w-[400px] ${
                isDark
                  ? "bg-slate-900 border border-slate-700"
                  : "bg-[#fff5f7]"
              }`}
            >
              <div className="flex-grow">
                <img
                  src={post.image}
                  alt={`${post.title} card`}
                  className="w-full h-48 object-cover rounded-t-lg mb-4"
                />
                <div className="flex items-center mb-4 gap-1.5">
                  <CiClock2 size={18} className="text-red-500" />
                  <span className="flex items-center pl-1 w-full h-8 text-red-500 rounded-full text-sm">
                    {post.dateLabel}
                  </span>
                </div>

                <div className="flex flex-col items-start gap-3 mt-auto">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        isDark ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {post.title}
                    </h3>
                  </div>
                  <p className={`mb-6 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    {post.excerpt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openBlogLink(post.link)}
                  className={`text-red-500 text-xs font-semibold underline hover:no-underline transition ${
                    post.link ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {post.ctaLabel || "READ MORE"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
