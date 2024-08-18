import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/appComp";
import { Home } from "@/Pages";
import { useAppStore } from "./store";
import { useEffect } from "react";
import { Toaster } from "sonner";

const App = () => {
  const { loadWallet } = useAppStore((state) => ({
    loadWallet: state.loadWallet,
  }));

  useEffect(() => {
    loadWallet();
  }, []);

  return (
    <BrowserRouter>
      <Toaster />
      <Navbar />
      <main className="container mx-auto lg:px-12 px-4">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
