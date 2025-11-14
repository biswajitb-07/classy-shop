const FreeShiping = () => {
  return (
    <div className="container grid items-center bg-white">
      <div
        className="flex flex-col gap-4 lg:flex-row items-center justify-between border border-red-500 py-8 px-5 shadow-2xl"
      >
        <div className="flex items-center justify-center gap-7">
          <img
            src="./freeshiping.svg"
            alt=""
            className="w-[2.5rem] lg:w-[3.5rem]"
          />
          <p className="text-xl md:text-2xl lg:text-3xl font-[500] tracking-wide text-center">
            Free Shiping
          </p>
        </div>

        <div>
          <p className="text-gray-600 text-[14px] md:text-[16px] text-center">
            Free Delivery Now On Your First Order and over $200
          </p>
        </div>

        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-wide text-center">
            - Only $200*
          </h1>
        </div>
      </div>
    </div>
  );
};

export default FreeShiping;
