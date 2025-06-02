/** Return the current accent colour defined in CSS variables. */
export function accentColor() {
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#6b7280"
    );
  }
  