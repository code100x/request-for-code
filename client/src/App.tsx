import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/appComp";
import { Home } from "@/Pages";

const App = () => {
  return (
    <BrowserRouter>
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
