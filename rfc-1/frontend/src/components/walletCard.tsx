import { Copy } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const WalletCard = ({
  wallet,
  index,
}: {
  wallet: {
    secret: string;
    public: string;
  };
  index: number;
}) => {
  return (
    <div className="border rounded-md p-3">
      <h3 className="font-bold underline">
        <Link to={`/${wallet.public}`}>Account {index + 1} </Link>
      </h3>

      <div className="flex items-center gap-2 justify-between mt-2">
        <p>Pub: {wallet.public.slice(0, 7)}...</p>
        <button
          onClick={() => {
            try {
              navigator.clipboard.writeText(wallet.public);
              toast.success("Copied");
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              toast.error("failed to copy");
            }
          }}
          className="hover:bg-muted duration-300 text-muted-foreground hover:text-foreground"
        >
          <Copy size={13} />
        </button>
      </div>
      <div className="flex items-center gap-2 justify-between mt-2">
        <p>Sec: {wallet.secret.slice(0, 7)}...</p>
        <button
          onClick={() => {
            try {
              navigator.clipboard.writeText(wallet.secret);
              toast.success("Copied");
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              toast.error("failed to copy");
            }
          }}
          className="hover:bg-muted duration-300 text-muted-foreground hover:text-foreground"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  );
};

export default WalletCard;
