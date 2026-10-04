import { useEffect } from "react";

// Browser ke tab ka title badalta hai
export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Ali Electronics` : "Ali Electronics - Your Electronics Partner";
  }, [title]);
}