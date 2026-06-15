import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

const BackButtonHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const setupListener = async () => {
      const listener = await CapacitorApp.addListener("backButton", () => {
        if (!active) return;
        
        const currentPath = window.location.pathname;

        // Home/root routes for each app mode where pressing back exits the app
        const homeRoutes = [
          "/",
          "/admin",
          "/admin/dashboard",
          "/delivery",
          "/delivery/orders",
        ];

        // For /delivery/orders, if there is a query parameter, we are in detail view, not home view
        const isHome = homeRoutes.includes(currentPath) && 
          (currentPath !== "/delivery/orders" || !window.location.search);

        if (isHome) {
          CapacitorApp.exitApp();
        } else if (currentPath === "/order-success") {
          // If on the success page, go back to home page instead of checkout form
          navigate("/", { replace: true });
        } else {
          // Default: Go back one step in history
          navigate(-1);
        }
      });

      return listener;
    };

    const listenerPromise = setupListener();

    return () => {
      active = false;
      listenerPromise.then((listener) => {
        listener.remove();
      });
    };
  }, [navigate]);

  return null;
};

export default BackButtonHandler;
