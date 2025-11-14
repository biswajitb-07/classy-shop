import FreeShiping from "../components/shipping/FreeShiping";
import HomeCatSlider from "../components/slider/HomeCatSlider";
import HomeSlider from "../components/slider/HomeSlider";
import BannerBox from "../components/Banner/BannerBox";
import PopularProduct from "../components/products/PopularProducts";
import LatestProduct from "../components/products/LatestProduct";
import FeatureProduct from "../components/products/FeatureProduct";
import MidBanner from "../components/Banner/MidBanner";
import Feedback from "../components/Testimonial/Feedback";
import Blog from "../components/Testimonial/Blog";

const Home = () => {
  return (
    <div>
      <div className="container">
        <HomeSlider />
        <HomeCatSlider />
      </div>
      <PopularProduct />
      <MidBanner />
      <div className="px-10 lg:px-24 my-10">
        <FreeShiping />
      </div>
      <BannerBox />
      <LatestProduct />
      <FeatureProduct />
      <Feedback />
      <Blog />
    </div>
  );
};

export default Home;
