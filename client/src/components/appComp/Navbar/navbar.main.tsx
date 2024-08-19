/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="glass__bg">
      <div className="container mx-auto sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center gap-10 h-16 lg:h-[72px]">
          <Link to="/" title="" className="text-2xl font-bold">
            BC-Wallet
          </Link>

          <Link to="/blockchain" title="" className="font-semibold">
            Blockchain
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
