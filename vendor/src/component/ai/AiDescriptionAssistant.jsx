import { Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { useGenerateProductDescriptionMutation } from "../../features/api/authApi";
import { useTheme } from "../../context/ThemeContext.jsx";

const AiDescriptionAssistant = ({ form, setForm, categoryLabel = "product" }) => {
  const [generateDescription, { isLoading, data }] = useGenerateProductDescriptionMutation();
  const { isDark } = useTheme();

  const handleGenerate = async () => {
    if (!String(form?.name || "").trim()) {
      toast.error("First enter product name.");
      return;
    }

    try {
      const response = await generateDescription({
        name: form?.name,
        brand: form?.brand,
        category: form?.category || categoryLabel,
        subCategory: form?.subCategory,
        thirdLevelCategory: form?.thirdLevelCategory,
        originalPrice: form?.originalPrice,
        discountedPrice: form?.discountedPrice,
        inStock: form?.inStock,
      }).unwrap();

      const generatedText =
        response?.description?.longDescription ||
        response?.description?.shortDescription ||
        "";

      if (generatedText) {
        setForm((prev) => ({
          ...prev,
          description: generatedText,
        }));
      }

      toast.success("AI description ready hai.");
    } catch (error) {
      toast.error(error?.data?.message || "Description generate nahi ho paya.");
    }
  };

  const highlights = data?.description?.bulletHighlights || [];
  const shellClass = isDark
    ? "border-slate-700 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96),rgba(49,46,129,0.72))] shadow-[0_16px_40px_rgba(2,6,23,0.35)]"
    : "border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm";
  const eyebrowClass = isDark ? "text-cyan-300" : "text-indigo-500";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-300" : "text-slate-600";
  const chipClass = isDark
    ? "bg-slate-950/80 text-slate-200 ring-1 ring-white/10"
    : "bg-white text-slate-700 ring-1 ring-indigo-100 shadow-sm";
  const buttonClass = isDark
    ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 text-slate-950 shadow-[0_14px_32px_rgba(14,165,233,0.24)]"
    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white";

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${shellClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] ${eyebrowClass}`}>
            <Sparkles size={14} />
            AI Description
          </p>
          <h5 className={`mt-2 text-base font-bold ${headingClass}`}>
            Generate polished product copy
          </h5>
          <p className={`mt-1 text-sm leading-6 ${bodyClass}`}>
            Name, brand, category aur pricing ke base par conversion-friendly description banega.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass}`}
        >
          <Wand2 size={16} />
          {isLoading ? "Generating..." : "Generate with AI"}
        </button>
      </div>

      {highlights.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${chipClass}`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default AiDescriptionAssistant;
