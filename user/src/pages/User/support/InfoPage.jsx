// File guide: InfoPage source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, Truck, FileText, Building2, CreditCard } from "lucide-react";
import { companyPages } from "../../../utils/siteSupport.js";

const iconMap = {
  delivery: Truck,
  "legal-notice": ShieldCheck,
  terms: FileText,
  "about-us": Building2,
  "secure-payment": CreditCard,
};

const InfoPage = () => {
  const { slug } = useParams();

  const page = useMemo(() => companyPages[slug], [slug]);

  if (!page) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">Page not found</h1>
          <p className="mt-3 text-slate-600">
            The support page you requested is not available.
          </p>
        </div>
      </section>
    );
  }

  const Icon = iconMap[slug] || FileText;
  const theme = page.theme;

  return (
    <section className="container mx-auto px-4 pb-8 md:px-3">
      <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.08)]">
        <div className={`${theme.shell} px-6 py-10 md:px-10 lg:px-12`}>
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${theme.badge}`}>
            <Icon size={14} />
            {page.eyebrow}
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {page.description}
          </p>
        </div>

        <div className="grid gap-8 px-6 py-10 md:px-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.accent}`}>
              Key points
            </p>
            <div className="mt-5 space-y-4">
              {page.highlights.map((item) => (
                <div
                  key={item}
                  className={`rounded-[24px] border px-5 py-4 text-slate-700 ${theme.card}`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.accent}`}>
              FAQs
            </p>
            <div className="mt-5 space-y-4">
              {page.faqs.map((item) => (
                <div
                  key={item.question}
                  className={`rounded-[24px] border px-5 py-5 shadow-sm ${theme.card}`}
                >
                  <h2 className="text-lg font-bold text-slate-950">
                    {item.question}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoPage;
