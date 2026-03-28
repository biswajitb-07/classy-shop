import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Trash2,
  ImagePlus,
  Link as LinkIcon,
  Quote,
  Pencil,
  X,
} from "lucide-react";
import {
  useAddSiteContentItemMutation,
  useDeleteSiteContentItemMutation,
  useGetSiteContentQuery,
  useUpdateSiteContentItemMutation,
} from "../../../features/api/contentApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { useTheme } from "../../../context/ThemeContext";

const emptyForms = {
  homeSlides: {
    link: "",
    alt: "",
    image: null,
  },
  bannerBoxes: {
    titleLines: "",
    price: "",
    link: "",
    textPosition: "left",
    ctaLabel: "show more",
    alt: "",
    image: null,
  },
  heroSlides: {
    eyebrow: "",
    title: "",
    subtitle: "",
    priceLabel: "",
    link: "",
    alt: "",
    image: null,
  },
  promoBanners: {
    title: "",
    price: "",
    link: "",
    overlayDirection: "left",
    textAlign: "left",
    ctaLabel: "Show More",
    alt: "",
    image: null,
  },
  testimonials: {
    name: "",
    role: "",
    content: "",
  },
  blogPosts: {
    title: "",
    excerpt: "",
    dateLabel: "",
    link: "",
    ctaLabel: "READ MORE",
    image: null,
  },
};

const sectionMeta = {
  homeSlides: {
    title: "Top Slider",
    description: "Main homepage carousel banners shown above categories.",
  },
  bannerBoxes: {
    title: "Banner Boxes",
    description: "Small promo cards shown below the mid-page section.",
  },
  heroSlides: {
    title: "Hero Slides",
    description: "Large left-side rotating promotional banners.",
  },
  promoBanners: {
    title: "Promo Banners",
    description: "Right-side promo banners shown beside the hero slider.",
  },
  testimonials: {
    title: "Client Testimonials",
    description: "What Our Clients Say carousel content.",
  },
  blogPosts: {
    title: "Blog Cards",
    description: "From The Blog section cards and links.",
  },
};

const hydrateFormFromItem = (section, item) => {
  if (section === "homeSlides") {
    return {
      link: item.link || "",
      alt: item.alt || "",
      image: null,
    };
  }

  if (section === "bannerBoxes") {
    return {
      titleLines: (item.titleLines || []).join("\n"),
      price: item.price || "",
      link: item.link || "",
      textPosition: item.textPosition || "left",
      ctaLabel: item.ctaLabel || "show more",
      alt: item.alt || "",
      image: null,
    };
  }

  if (section === "heroSlides") {
    return {
      eyebrow: item.eyebrow || "",
      title: item.title || "",
      subtitle: item.subtitle || "",
      priceLabel: item.priceLabel || "",
      link: item.link || "",
      alt: item.alt || "",
      image: null,
    };
  }

  if (section === "promoBanners") {
    return {
      title: item.title || "",
      price: item.price || "",
      link: item.link || "",
      overlayDirection: item.overlayDirection || "left",
      textAlign: item.textAlign || "left",
      ctaLabel: item.ctaLabel || "Show More",
      alt: item.alt || "",
      image: null,
    };
  }

  if (section === "testimonials") {
    return {
      name: item.name || "",
      role: item.role || "",
      content: item.content || "",
    };
  }

  return {
    title: item.title || "",
    excerpt: item.excerpt || "",
    dateLabel: item.dateLabel || "",
    link: item.link || "",
    ctaLabel: item.ctaLabel || "READ MORE",
    image: null,
  };
};

const SiteContentManager = () => {
  const { isDark } = useTheme();
  const { data, isLoading, isError, refetch } = useGetSiteContentQuery();
  const [addSiteContentItem, { isLoading: isAdding }] =
    useAddSiteContentItemMutation();
  const [updateSiteContentItem, { isLoading: isUpdating }] =
    useUpdateSiteContentItemMutation();
  const [deleteSiteContentItem] = useDeleteSiteContentItemMutation();
  const [forms, setForms] = useState(emptyForms);
  const [imagePreviews, setImagePreviews] = useState({});
  const [activeSection, setActiveSection] = useState("bannerBoxes");
  const [editingItem, setEditingItem] = useState(null);
  const [deletingTarget, setDeletingTarget] = useState(null);

  const content = data?.content || {};

  const surfaceClass = isDark
    ? "bg-slate-900 border border-slate-700 text-slate-100"
    : "bg-white border border-gray-100 text-slate-900";
  const inputClass = isDark
    ? "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-slate-800 outline-none";
  const textareaClass = `${inputClass} min-h-28 resize-y`;

  const sectionEntries = useMemo(() => Object.entries(sectionMeta), []);

  const updateForm = (section, field, value) => {
    setForms((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateSectionImage = (section, file) => {
    setForms((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        image: file,
      },
    }));

    setImagePreviews((prev) => {
      if (prev[section]?.startsWith("blob:")) {
        URL.revokeObjectURL(prev[section]);
      }

      return {
        ...prev,
        [section]: file ? URL.createObjectURL(file) : "",
      };
    });
  };

  const resetSectionForm = (section) => {
    setForms((prev) => ({
      ...prev,
      [section]: emptyForms[section],
    }));
    setImagePreviews((prev) => {
      if (prev[section]?.startsWith("blob:")) {
        URL.revokeObjectURL(prev[section]);
      }

      return {
        ...prev,
        [section]: "",
      };
    });
  };

  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((preview) => {
        if (typeof preview === "string" && preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);

  const buildBody = (section) => {
    const form = forms[section];
    const body = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      if (key === "image") {
        body.append("image", value);
        return;
      }
      body.append(key, value);
    });

    return body;
  };

  const handleAdd = async (section) => {
    const body = buildBody(section);

    try {
      await addSiteContentItem({ section, body }).unwrap();
      toast.success(`${sectionMeta[section].title} item added`);
      resetSectionForm(section);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add item");
    }
  };

  const handleEditStart = (section, item) => {
    setActiveSection(section);
    setEditingItem({
      section,
      itemId: item._id,
      image: item.image || "",
    });
    setImagePreviews((prev) => ({
      ...prev,
      [section]: item.image || "",
    }));
    setForms((prev) => ({
      ...prev,
      [section]: hydrateFormFromItem(section, item),
    }));
  };

  const handleEditCancel = (section) => {
    setEditingItem(null);
    resetSectionForm(section);
  };

  const handleUpdate = async (section) => {
    if (!editingItem?.itemId || editingItem.section !== section) return;

    const body = buildBody(section);

    try {
      await updateSiteContentItem({
        section,
        itemId: editingItem.itemId,
        body,
      }).unwrap();
      toast.success(`${sectionMeta[section].title} item updated`);
      setEditingItem(null);
      resetSectionForm(section);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update item");
    }
  };

  const handleDelete = async (section, itemId) => {
    try {
      setDeletingTarget(`${section}:${itemId}`);
      await deleteSiteContentItem({ section, itemId }).unwrap();
      toast.success("Item removed");

      if (
        editingItem?.section === section &&
        editingItem?.itemId === itemId
      ) {
        setEditingItem(null);
        resetSectionForm(section);
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete item");
    } finally {
      setDeletingTarget(null);
    }
  };

  if (isLoading) return <PageLoader message="Loading site content..." />;
  if (isError) return <ErrorMessage onRetry={refetch} />;

  const renderSectionForm = (section) => {
    const form = forms[section];

    if (section === "bannerBoxes") {
      return (
        <>
          <textarea
            value={form.titleLines}
            onChange={(e) => updateForm(section, "titleLines", e.target.value)}
            placeholder="Title lines, one per line"
            className={textareaClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.price}
              onChange={(e) => updateForm(section, "price", e.target.value)}
              placeholder="Price label"
              className={inputClass}
            />
            <select
              value={form.textPosition}
              onChange={(e) =>
                updateForm(section, "textPosition", e.target.value)
              }
              className={inputClass}
            >
              <option value="left">Text Left</option>
              <option value="right">Text Right</option>
            </select>
          </div>
          <input
            value={form.link}
            onChange={(e) => updateForm(section, "link", e.target.value)}
            placeholder="Optional product/internal link"
            className={inputClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.ctaLabel}
              onChange={(e) => updateForm(section, "ctaLabel", e.target.value)}
              placeholder="CTA label"
              className={inputClass}
            />
            <input
              value={form.alt}
              onChange={(e) => updateForm(section, "alt", e.target.value)}
              placeholder="Image alt text"
              className={inputClass}
            />
          </div>
        </>
      );
    }

    if (section === "homeSlides") {
      return (
        <>
          <input
            value={form.link}
            onChange={(e) => updateForm(section, "link", e.target.value)}
            placeholder="Optional banner click link"
            className={inputClass}
          />
          <input
            value={form.alt}
            onChange={(e) => updateForm(section, "alt", e.target.value)}
            placeholder="Image alt text"
            className={inputClass}
          />
        </>
      );
    }

    if (section === "heroSlides") {
      return (
        <>
          <input
            value={form.eyebrow}
            onChange={(e) => updateForm(section, "eyebrow", e.target.value)}
            placeholder="Eyebrow text"
            className={inputClass}
          />
          <input
            value={form.title}
            onChange={(e) => updateForm(section, "title", e.target.value)}
            placeholder="Title"
            className={inputClass}
          />
          <input
            value={form.subtitle}
            onChange={(e) => updateForm(section, "subtitle", e.target.value)}
            placeholder="Subtitle"
            className={inputClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.priceLabel}
              onChange={(e) =>
                updateForm(section, "priceLabel", e.target.value)
              }
              placeholder="Price label"
              className={inputClass}
            />
            <input
              value={form.alt}
              onChange={(e) => updateForm(section, "alt", e.target.value)}
              placeholder="Image alt text"
              className={inputClass}
            />
          </div>
          <input
            value={form.link}
            onChange={(e) => updateForm(section, "link", e.target.value)}
            placeholder="Optional click link"
            className={inputClass}
          />
        </>
      );
    }

    if (section === "promoBanners") {
      return (
        <>
          <input
            value={form.title}
            onChange={(e) => updateForm(section, "title", e.target.value)}
            placeholder="Promo title"
            className={inputClass}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.price}
              onChange={(e) => updateForm(section, "price", e.target.value)}
              placeholder="Price"
              className={inputClass}
            />
            <input
              value={form.alt}
              onChange={(e) => updateForm(section, "alt", e.target.value)}
              placeholder="Image alt text"
              className={inputClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.overlayDirection}
              onChange={(e) =>
                updateForm(section, "overlayDirection", e.target.value)
              }
              className={inputClass}
            >
              <option value="left">Overlay Left</option>
              <option value="right">Overlay Right</option>
            </select>
            <select
              value={form.textAlign}
              onChange={(e) => updateForm(section, "textAlign", e.target.value)}
              className={inputClass}
            >
              <option value="left">Text Left</option>
              <option value="right">Text Right</option>
            </select>
          </div>
          <input
            value={form.link}
            onChange={(e) => updateForm(section, "link", e.target.value)}
            placeholder="Optional click link"
            className={inputClass}
          />
          <input
            value={form.ctaLabel}
            onChange={(e) => updateForm(section, "ctaLabel", e.target.value)}
            placeholder="CTA label"
            className={inputClass}
          />
        </>
      );
    }

    if (section === "testimonials") {
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => updateForm(section, "name", e.target.value)}
              placeholder="Client name"
              className={inputClass}
            />
            <input
              value={form.role}
              onChange={(e) => updateForm(section, "role", e.target.value)}
              placeholder="Client role"
              className={inputClass}
            />
          </div>
          <textarea
            value={form.content}
            onChange={(e) => updateForm(section, "content", e.target.value)}
            placeholder="Testimonial content"
            className={textareaClass}
          />
        </>
      );
    }

    return (
      <>
        <input
          value={form.title}
          onChange={(e) => updateForm(section, "title", e.target.value)}
          placeholder="Blog title"
          className={inputClass}
        />
        <textarea
          value={form.excerpt}
          onChange={(e) => updateForm(section, "excerpt", e.target.value)}
          placeholder="Excerpt"
          className={textareaClass}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.dateLabel}
            onChange={(e) => updateForm(section, "dateLabel", e.target.value)}
            placeholder="Date label"
            className={inputClass}
          />
          <input
            value={form.ctaLabel}
            onChange={(e) => updateForm(section, "ctaLabel", e.target.value)}
            placeholder="CTA label"
            className={inputClass}
          />
        </div>
        <input
          value={form.link}
          onChange={(e) => updateForm(section, "link", e.target.value)}
          placeholder="Optional read more link"
          className={inputClass}
        />
      </>
    );
  };

  const renderItems = (section) => {
    const items = content?.[section] || [];

    if (!items.length) {
      return (
        <div
          className={`rounded-2xl border border-dashed p-6 text-sm ${
            isDark
              ? "border-slate-700 text-slate-400"
              : "border-gray-200 text-slate-500"
          }`}
        >
          No items yet.
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item._id} className={`rounded-2xl p-4 ${surfaceClass}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.alt || item.title || item.name}
                    className="mb-4 h-32 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h3 className="text-base font-bold">
                  {item.title ||
                    item.name ||
                    item.alt ||
                    item.titleLines?.join(" / ")}
                </h3>
                {item.role ? (
                  <p className="mt-1 text-sm text-slate-500">{item.role}</p>
                ) : null}
                {item.subtitle ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {item.subtitle}
                  </p>
                ) : null}
                {item.price || item.priceLabel ? (
                  <p className="mt-2 text-sm font-semibold text-rose-500">
                    {item.price || item.priceLabel}
                  </p>
                ) : null}
                {item.content ? (
                  <p className="mt-2 text-sm leading-6">{item.content}</p>
                ) : null}
                {item.excerpt ? (
                  <p className="mt-2 text-sm leading-6">{item.excerpt}</p>
                ) : null}
                {item.dateLabel ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-rose-500">
                    {item.dateLabel}
                  </p>
                ) : null}
                {item.link ? (
                  <p className="mt-3 flex items-center gap-2 break-all text-xs text-sky-500">
                    <LinkIcon size={14} />
                    {item.link}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditStart(section, item)}
                  disabled={isUpdating}
                  className="rounded-xl bg-sky-500 p-2 text-white transition hover:bg-sky-600 disabled:opacity-50"
                  aria-label="Edit item"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(section, item._id)}
                  disabled={Boolean(deletingTarget)}
                  className="rounded-xl bg-red-500 p-2 text-white transition hover:bg-red-600 disabled:opacity-50"
                  aria-label="Delete item"
                >
                  {deletingTarget === `${section}:${item._id}` ? (
                    <AuthButtonLoader size={16} color="#ffffff" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 mb-10">
      <div>
        <h1
          className={`text-2xl font-extrabold ${
            isDark ? "text-white" : "text-slate-900"
          }`}
        >
          Site Content Manager
        </h1>
        <p
          className={`mt-2 text-sm ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
        >
          Manage homepage banners, client testimonials, and blog cards. Banner
          clicks only redirect when a link is added.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-5">
        {sectionEntries.map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
              activeSection === key
                ? "bg-black text-white"
                : isDark
                  ? "bg-slate-900 text-slate-200"
                  : "bg-white text-slate-700 shadow-sm"
            }`}
          >
            {meta.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.4fr]">
        <div className={`rounded-3xl p-6 ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              {sectionMeta[activeSection].title}
            </h2>
            <p
              className={`mt-2 text-sm ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {sectionMeta[activeSection].description}
            </p>

            {editingItem?.section === activeSection ? (
              <div
                className={`mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${
                  isDark
                    ? "bg-slate-950 text-slate-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <span>Editing selected item</span>
                <button
                  type="button"
                  onClick={() => handleEditCancel(activeSection)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {renderSectionForm(activeSection)}

            {activeSection !== "testimonials" ? (
              <div className="space-y-3">
                {imagePreviews[activeSection] ? (
                  <img
                    src={imagePreviews[activeSection]}
                    alt="Current content"
                    className="h-28 w-full rounded-2xl object-cover"
                  />
                ) : null}

                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-sm ${
                    isDark
                      ? "border-slate-700 text-slate-300"
                      : "border-gray-300 text-slate-600"
                  }`}
                >
                  <ImagePlus size={18} />
                  <span className="flex-1 truncate">
                    {forms[activeSection].image?.name ||
                      (editingItem?.section === activeSection
                        ? "Choose new image to replace current image"
                        : "Choose image")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      updateSectionImage(activeSection, e.target.files?.[0] || null)
                    }
                  />
                </label>
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-sm ${
                  isDark
                    ? "bg-slate-950 text-slate-400"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                <Quote size={18} />
                Testimonial cards do not need an image.
              </div>
            )}

            {editingItem?.section === activeSection ? (
              <button
                type="button"
                onClick={() => handleUpdate(activeSection)}
                disabled={isUpdating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {isUpdating ? <AuthButtonLoader size={16} /> : null}
                Update Item
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAdd(activeSection)}
                disabled={isAdding}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isAdding ? <AuthButtonLoader size={16} /> : null}
                Add Item
              </button>
            )}
          </div>
        </div>

        <div>
          <h2
            className={`mb-4 text-lg font-bold ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Existing Items
          </h2>
          {renderItems(activeSection)}
        </div>
      </div>
    </div>
  );
};

export default SiteContentManager;
