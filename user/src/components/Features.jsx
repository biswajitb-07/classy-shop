import React, { useState } from "react";
import {
  FaShippingFast,
  FaExchangeAlt,
  FaCreditCard,
  FaGift,
  FaHeadset,
} from "react-icons/fa";

const Features = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const features = [
    {
      icon: <FaShippingFast className="text-2xl md:text-3xl" />,
      title: "Free Shipping",
      description: "For all Orders Over $100",
    },
    {
      icon: <FaExchangeAlt className="text-2xl md:text-3xl" />,
      title: "30 Days Returns",
      description: "For an Exchange Product",
    },
    {
      icon: <FaCreditCard className="text-2xl md:text-3xl" />,
      title: "Secured Payment",
      description: "Payment Cards Accepted",
    },
    {
      icon: <FaGift className="text-2xl md:text-3xl" />,
      title: "Special Gifts",
      description: "Our First Product Order",
    },
    {
      icon: <FaHeadset className="text-2xl md:text-3xl" />,
      title: "Support 24/7",
      description: "Contact us Anytime",
    },
  ];

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 hover:bg-white rounded-lg cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`text-red-400 mb-3 transition-all duration-300 ease-linear ${
                  hoveredIndex === index ? "-translate-y-4" : ""
                }`}
              >
                {feature.icon}
              </div>
              <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
              <p className="text-gray-600 text-sm mt-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
