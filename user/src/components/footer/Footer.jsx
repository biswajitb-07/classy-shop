import {
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaPinterest,
} from "react-icons/fa";
import { motion } from "framer-motion";

// Animation variants for the social icons container
const socialVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

// Animation variants for individual social icons
const iconVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// Animation variants for the copyright text
const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
};

const Footer = () => {
  return (
    <motion.footer
      className="bg-gray-100 pb-[5.5rem] lg:pb-16 pt-8 px-4 h-auto"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.3 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Social Icons */}
        <motion.div
          className="flex justify-center space-x-6 mb-6"
          variants={socialVariants}
        >
          <motion.a
            href="#"
            className="text-gray-600 hover:text-red-500"
            variants={iconVariants}
          >
            <FaTwitter className="h-5 w-5" />
          </motion.a>
          <motion.a
            href="#"
            className="text-gray-600 hover:text-red-500"
            variants={iconVariants}
          >
            <FaFacebook className="h-5 w-5" />
          </motion.a>
          <motion.a
            href="#"
            className="text-gray-600 hover:text-red-500"
            variants={iconVariants}
          >
            <FaInstagram className="h-5 w-5" />
          </motion.a>
          <motion.a
            href="#"
            className="text-gray-600 hover:text-red-500"
            variants={iconVariants}
          >
            <FaPinterest className="h-5 w-5" />
          </motion.a>
        </motion.div>

        {/* Copyright Text */}
        <motion.div
          className="text-center text-gray-500 text-sm"
          variants={textVariants}
        >
          <p>© 2025 - Ecommerce software by PrestaShop™</p>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;
