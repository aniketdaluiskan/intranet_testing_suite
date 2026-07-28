import { useEffect } from "react";
import { useStore } from "../store";

/**
 * When "Highlight fields" is on, follows the cursor with a small tooltip showing the hovered
 * capturable field's `kind · label · valid|invalid` (read from the data-cap/kind/label attributes
 * the attribute engine stamps on every field). The outline itself is pure CSS (html[data-hl]); this
 * only adds the hover readout, which a CSS ::after can't do on <input>/<select>. Listener + tooltip
 * are torn down when the toggle is off, and the tooltip carries data-ap-control so the sweep ignores
 * it (highlight is a manual QA aid, off during automation anyway).
 */
export default function FieldHighlight() {
  const { settings } = useStore();

  useEffect(() => {
    if (!settings.highlightFields) return;
    const tip = document.createElement("div");
    tip.className = "cap-tip";
    tip.setAttribute("data-ap-control", "1");
    tip.style.display = "none";
    document.body.appendChild(tip);

    const move = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const el = t && typeof t.closest === "function" ? (t.closest("[data-cap]") as HTMLElement | null) : null;
      if (!el) {
        tip.style.display = "none";
        return;
      }
      const kind = el.getAttribute("data-kind") || "";
      const label = el.getAttribute("data-label") || "";
      const cap = el.getAttribute("data-cap") || "";
      tip.textContent = `${kind} · ${label} · ${cap}`;
      tip.style.display = "block";
      tip.style.left = e.clientX + 12 + "px";
      tip.style.top = e.clientY + 16 + "px";
    };

    document.addEventListener("mousemove", move, true);
    return () => {
      document.removeEventListener("mousemove", move, true);
      tip.remove();
    };
  }, [settings.highlightFields]);

  return null;
}
