import { Wallet, WalletContainer } from "@/components/appComp";
import { useAppStore } from "@/store";

const Home = () => {
  const { wallet } = useAppStore((state) => ({
    wallet: state.wallet,
  }));
  return <>{wallet ? <WalletContainer /> : <Wallet />}</>;
};

export default Home;
