import React from "react";

const Navbar = () => {
  return (
    <div className="border-b ">
      <div className="container py-3 flex gap-6">
        <h1 className="text-lg font-bold">Our Coin</h1>
        <div className="flex gap-2 items-center">
          <nav>
            <a
              className="text-sm text-muted-foreground hover:text-foreground hover:duration-300"
              href={"/"}
            >
              Home
            </a>
          </nav>
          <nav>
            <a
              className="text-sm text-muted-foreground hover:text-foreground hover:duration-300"
              href={"/blockchain"}
            >
              Live Blockchain
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
