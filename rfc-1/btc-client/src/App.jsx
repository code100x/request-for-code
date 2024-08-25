import "./App.css";
import WalletAndDashboard from "./components/WalletDashboard";
import { BlockChainProvider } from "./contexts/BlockChainContext";

function App() {
  return (
    <BlockChainProvider>
      <WalletAndDashboard />
    </BlockChainProvider>
  );
}

export default App;
