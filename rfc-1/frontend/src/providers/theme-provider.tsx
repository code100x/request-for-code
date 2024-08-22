import React, { useEffect } from "react";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.add("dark");
  }, []);

  return <div>{children}</div>;
};

export default ThemeProvider;
