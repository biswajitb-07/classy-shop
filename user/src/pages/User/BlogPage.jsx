import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useStableSiteContent } from "../../hooks/useStableSiteContent.js";
import {
  buildBlogHighlights,
  buildBlogNarrative,
  estimateBlogReadingTime,
  findBlogPostBySlug,
  getBlogPath,
} from "../../utils/blog.js";

const BlogPage = () => {
  const { slug } = useParams();
  const { isDark } = useTheme();
  const { content } = useStableSiteContent();
  const posts = content?.blogPosts || [];
  const activePost = slug ? findBlogPostBySlug(posts, slug) : posts[0] || null;
  const relatedPosts = posts.filter((post) => post !== activePost).slice(0, 3);
  const storyParagraphs = buildBlogNarrative(activePost);
  const highlights = buildBlogHighlights(activePost);
  const readingTime = estimateBlogReadingTime(activePost);

  if (!activePost) {
    return (
      <section className="container mx-auto px-4 py-16">
        <div
          className={`rounded-[32px] border px-6 py-14 text-center ${
            isDark
              ? "border-slate-800 bg-slate-950 text-slate-100"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-rose-500">
            Blog
          </p>
          <h1 className="mt-4 text-3xl font-black">No blog post available</h1>
          <p className="mt-3 text-sm text-slate-500">
            Abhi koi blog content publish nahi hua hai.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-5 py-3 text-sm font-bold text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  const surfaceClass = isDark
    ? "border-slate-800 bg-slate-950/90 text-slate-100"
    : "border-slate-200 bg-white/90 text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <section
      className={`relative overflow-hidden py-10 ${
        isDark
          ? "bg-[linear-gradient(180deg,#020617_0%,#081121_38%,#0f172a_100%)]"
          : "bg-[linear-gradient(180deg,#fff7ed_0%,#fff1f2_44%,#ffffff_100%)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-8rem] top-10 h-52 w-52 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-60 w-60 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold transition ${
              isDark
                ? "border-slate-800 bg-slate-950/70 text-slate-200 hover:border-slate-700"
                : "border-white/80 bg-white/90 text-slate-700 hover:border-rose-200"
            }`}
          >
            <ArrowLeft size={16} />
            Home
          </Link>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold ${
              isDark
                ? "border-slate-800 bg-slate-950/60 text-slate-300"
                : "border-white/80 bg-white/90 text-slate-600"
            }`}
          >
            <BookOpen size={16} />
            From The Blog
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-[36px] border shadow-[0_24px_90px_rgba(15,23,42,0.12)] ${surfaceClass}`}
        >
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[20rem] overflow-hidden lg:min-h-[34rem]">
              <img
                src={activePost.image}
                alt={activePost.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.72))]" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-white backdrop-blur">
                  <Sparkles size={14} />
                  Editorial Story
                </div>
                <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-white md:text-5xl">
                  {activePost.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                  {activePost.excerpt}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 md:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose-500">
                  Story Details
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div
                    className={`rounded-[24px] border px-4 py-4 ${
                      isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarDays size={16} className="text-rose-500" />
                      Published
                    </div>
                    <p className={`mt-2 text-sm ${mutedClass}`}>
                      {activePost.dateLabel || "Latest update"}
                    </p>
                  </div>
                  <div
                    className={`rounded-[24px] border px-4 py-4 ${
                      isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock3 size={16} className="text-orange-500" />
                      Reading time
                    </div>
                    <p className={`mt-2 text-sm ${mutedClass}`}>
                      {readingTime} min read
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-6 rounded-[28px] border p-5 ${
                    isDark
                      ? "border-slate-800 bg-[linear-gradient(180deg,#0f172a,#111827)]"
                      : "border-slate-200 bg-[linear-gradient(180deg,#fff7ed,#ffffff)]"
                  }`}
                >
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-500">
                    Quick Highlights
                  </p>
                  <div className="mt-4 space-y-3">
                    {highlights.map((item) => (
                      <div
                        key={item}
                        className={`rounded-[20px] px-4 py-3 text-sm leading-6 ${
                          isDark ? "bg-slate-900 text-slate-200" : "bg-white text-slate-700"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm font-bold text-rose-500 transition hover:gap-3"
                >
                  Explore storefront
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <article
            className={`rounded-[32px] border p-6 md:p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${surfaceClass}`}
          >
            <div className="space-y-6">
              {storyParagraphs.map((paragraph, index) => (
                <p
                  key={`${activePost.title}-${index}`}
                  className={`text-base leading-8 ${
                    index === 0 ? "font-medium" : mutedClass
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {highlights.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className={`rounded-[24px] border p-4 ${
                    isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-500">
                    Note {index + 1}
                  </p>
                  <p className={`mt-3 text-sm leading-7 ${mutedClass}`}>{item}</p>
                </div>
              ))}
            </div>
          </article>

          <aside className="space-y-4">
            <div
              className={`rounded-[32px] border p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${surfaceClass}`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-500">
                More Stories
              </p>
              <div className="mt-4 space-y-4">
                {[activePost, ...relatedPosts].slice(0, 4).map((post, index) => (
                  <Link
                    key={`${post.title}-${index}`}
                    to={getBlogPath(post, posts.indexOf(post))}
                    className={`block rounded-[24px] border p-3 transition ${
                      post === activePost
                        ? isDark
                          ? "border-rose-500/40 bg-slate-900"
                          : "border-rose-200 bg-rose-50"
                        : isDark
                          ? "border-slate-800 bg-slate-950 hover:border-slate-700"
                          : "border-slate-200 bg-white hover:border-rose-200"
                    }`}
                  >
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-32 w-full rounded-[18px] object-cover"
                    />
                    <p className="mt-3 text-sm font-bold">{post.title}</p>
                    <p className={`mt-1 text-xs ${mutedClass}`}>{post.dateLabel}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default BlogPage;
