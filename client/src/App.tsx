import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/appComp";
import { BlockChainStats, Home } from "@/Pages";
import { useAppStore } from "./store";
import { useEffect } from "react";
import { Toaster } from "sonner";

const App = () => {
  const {
    loadWallet,
    initWsClient,
    wsClient,
    listenEvents,
    wallet,
    sendEventRequest,
    isSocketConnected,
  } = useAppStore((state) => ({
    loadWallet: state.loadWallet,
    initWsClient: state.initWsClient,
    wsClient: state.wsClient,
    listenEvents: state.listenEvents,
    wallet: state.wallet,
    sendEventRequest: state.sendEventRequest,
    isSocketConnected: state.isSocketConnected,
  }));

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    if (!wsClient) {
      initWsClient();
    }
    if (isSocketConnected && wallet) {
      console.log("Listening to events");
      setTimeout(() => {
        listenEvents();
        sendEventRequest();
      }, 1000);
    }
  }, [wsClient, wallet, isSocketConnected]);

  return (
    <BrowserRouter>
      <Toaster />
      <Navbar />
      <main className="container mx-auto lg:px-12 px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blockchain" element={<BlockChainStats />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
