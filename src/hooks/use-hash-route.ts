import { useState, useEffect } from "react";

export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || "/");

  useEffect(() => {
    const handler = () => setHash(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return hash;
}
