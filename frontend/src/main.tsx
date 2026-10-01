import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { StoreProvider } from "./store/Store";
import { App } from "./App";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <StoreProvider>
      <App />
      <Toaster richColors position="bottom-right" />
    </StoreProvider>
  </BrowserRouter>,
);
