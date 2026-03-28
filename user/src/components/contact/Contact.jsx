import { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaCommentDots,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext.jsx";
import { Link } from "react-router-dom";
import { companyPageList } from "../../utils/siteSupport.js";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useSubscribeNewsletterMutation } from "../../features/api/newsletterApi.js";

const Contact = () => {
  const [isChecked, setIsChecked] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const [email, setEmail] = useState("");
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [subscribeNewsletter, { isLoading: isSubscribing }] =
    useSubscribeNewsletterMutation();

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleAccordion = (section) => {
    if (!isLargeScreen) {
      setOpenAccordion(openAccordion === section ? null : section);
    }
  };

  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleNewsletterSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Please enter your email");
      return;
    }

    if (!isChecked) {
      toast.error("Please agree to the terms first");
      return;
    }

    try {
      const response = await subscribeNewsletter({
        email: normalizedEmail,
      }).unwrap();

      toast.success(response.message || "Subscribed successfully");
      setEmail("");
      setIsChecked(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to subscribe");
    }
  };

  // Animation variants for accordion
  const accordionVariants = {
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: "easeInOut" },
        opacity: { duration: 0.3, ease: "easeInOut" },
      },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: "easeInOut" },
        opacity: { duration: 0.3, ease: "easeInOut" },
      },
    },
  };

  // Animation variants for button
  const buttonVariants = {
    enabled: {
      scale: 1,
      backgroundColor: "#ff0000",
      transition: { duration: 0.2 },
      opacity: 1,
    },
    disabled: {
      scale: 1,
      backgroundColor: "#fca5a5",
      opacity: 0.5,
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 },
    },
  };

  // Animation variants for input
  const inputVariants = {
    focus: {
      scale: 1.02,
      borderColor: "#3b82f6",
      transition: { duration: 0.2 },
    },
    blur: {
      scale: 1,
      borderColor: "#d1d5db",
      transition: { duration: 0.2 },
    },
  };

  return (
    <div className="container mx-auto p-4">
      <hr className="my-5 border-gray-200" />
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Contact Us Section */}
        <div>
          <div
            className="lg:block flex justify-between items-center cursor-pointer"
            onClick={() => toggleAccordion("contact")}
          >
            <p className="text-sm md:text-xl font-bold mb-6 lg:mb-6">
              Contact Us
            </p>
            <span className="lg:hidden">
              {openAccordion === "contact" ? (
                <FaChevronUp />
              ) : (
                <FaChevronDown />
              )}
            </span>
          </div>
          <AnimatePresence>
            {(isLargeScreen || openAccordion === "contact") && (
              <motion.div
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                <div className="flex flex-col items-start justify-center gap-3">
                  <div>
                    <p className="text-sm mb-4">
                      Classyshop - Mega Super Store
                    </p>
                    <p className="text-gray-600">507-Union Trade Centre</p>
                    <p className="text-gray-600">India</p>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <FaEnvelope className="mr-2 text-gray-600" />
                      <span className="font-medium">Email:</span>
                    </div>
                    <p className="text-red-500">support@classyshop.site</p>
                  </div>
                  <div>
                    <div className="flex items-center mb-2">
                      <FaPhoneAlt className="mr-2 text-gray-600" />
                      <span className="font-medium">Phone:</span>
                    </div>
                    <p className="text-red-500">(+91) 77777777</p>
                  </div>
                </div>

                <div onClick={() => navigate("/support")}  className={`mt-8 rounded-lg cursor-pointer ${isDark ? "bg-slate-900 border border-slate-700" : "bg-blue-50"}`}>
                  <div className="flex items-start">
                    <FaCommentDots className="mr-2 text-red-600" />
                    <span className="font-medium text-red-600">
                      Online Chat
                    </span>
                  </div>
                  <p className={`mt-2 font-semibold ${isDark ? "text-white" : "text-black"}`}>
                    Get Expert Help
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <hr className="text-red-300 mt-2 lg:hidden" />
        </div>

        {/* Products Section */}
        <div>
          <div
            className="lg:block flex justify-between items-center cursor-pointer"
            onClick={() => toggleAccordion("products")}
          >
            <h2 className="text-sm md:text-xl font-semibold mb-4 lg:mb-4">
              Products
            </h2>
            <span className="lg:hidden">
              {openAccordion === "products" ? (
                <FaChevronUp />
              ) : (
                <FaChevronDown />
              )}
            </span>
          </div>
          <AnimatePresence>
            {(isLargeScreen || openAccordion === "products") && (
              <motion.div
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                <ul className="space-y-2 text-gray-600">
                  <li>Prices Drop</li>
                  <li>New Products</li>
                  <li>Best Sales</li>
                  <li>
                    <Link to="/support" className="transition hover:text-red-500">
                      Support
                    </Link>
                  </li>
                  <li>Sitemap</li>
                  <li>Stores</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <hr className="text-red-300 mt-2 lg:hidden" />
        </div>

        {/* Our Company Section */}
        <div>
          <div
            className="lg:block flex justify-between items-center cursor-pointer"
            onClick={() => toggleAccordion("company")}
          >
            <h2 className="text-sm md:text-xl font-semibold mb-4 lg:mb-4">
              Our Company
            </h2>
            <span className="lg:hidden">
              {openAccordion === "company" ? (
                <FaChevronUp />
              ) : (
                <FaChevronDown />
              )}
            </span>
          </div>
          <AnimatePresence>
            {(isLargeScreen || openAccordion === "company") && (
              <motion.div
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                <ul className="space-y-2 text-gray-600">
                  {companyPageList.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/company/${item.slug}`}
                        className="transition hover:text-red-500"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <hr className="text-red-300 mt-2 lg:hidden" />
        </div>

        {/* Newsletter Section */}
        <div>
          <div
            className="lg:block flex justify-between items-center cursor-pointer"
            onClick={() => toggleAccordion("newsletter")}
          >
            <h2 className="text-sm md:text-xl font-semibold mb-4 lg:mb-4">
              Subscribe To Newsletter
            </h2>
            <span className="lg:hidden">
              {openAccordion === "newsletter" ? (
                <FaChevronUp />
              ) : (
                <FaChevronDown />
              )}
            </span>
          </div>
          <AnimatePresence>
            {(isLargeScreen || openAccordion === "newsletter") && (
              <motion.div
                variants={accordionVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                <p className="text-gray-600 mb-4">
                  Subscribe to our latest newsletter to get news about special
                  discounts.
                </p>
                <div className="mb-4">
                  <label className="block text-gray-600 mb-2">
                    Your Email Address
                  </label>
                  <motion.input
                    type="email"
                    className="w-full px-4 py-2 border rounded focus:outline-none"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    variants={inputVariants}
                    whileFocus="focus"
                    initial="blur"
                    animate="blur"
                  />
                </div>
                <motion.button
                  className={`w-full py-2 px-4 rounded text-white`}
                  disabled={!isChecked || isSubscribing}
                  onClick={handleNewsletterSubmit}
                  variants={buttonVariants}
                  initial={isChecked && !isSubscribing ? "enabled" : "disabled"}
                  animate={isChecked && !isSubscribing ? "enabled" : "disabled"}
                  whileHover={isChecked && !isSubscribing ? "hover" : ""}
                >
                  {isSubscribing ? "SUBSCRIBING..." : "SUBSCRIBE"}
                </motion.button>
                <div className="mt-4 flex items-start">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    className="mt-1 mr-2 cursor-pointer accent-red-500"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                  />
                  <label htmlFor="agreeTerms" className="text-gray-600 text-sm">
                    I agree to the terms and conditions and the privacy policy
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <hr className="text-red-300 mt-2 lg:hidden" />
        </div>
      </div>
    </div>
  );
};

export default Contact;
