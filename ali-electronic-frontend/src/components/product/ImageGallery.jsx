import { useEffect, useState } from "react";
import { imgUrl } from "../../utils/format.js";

const ZOOM = 2.5;

export default function ImageGallery({ images, alt }) {
  const [index, setIndex] = useState(0);
  const [zoomMode, setZoomMode] = useState(false); // button se on/off
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });

  const total = images.length;
  const key = images.join("|");

  // product badalne par pehli tasveer aur zoom band
  useEffect(() => {
    setIndex(0);
    setZoomMode(false);
    setZoom({ on: false, x: 50, y: 50 });
  }, [key]);

  const go = (step) => {
    setZoom((z) => ({ ...z, on: false }));
    setIndex((i) => (i + step + total) % total);
  };

  const toggleZoom = () => {
    setZoomMode((z) => !z);
    setZoom((z) => ({ ...z, on: false }));
  };

  // zoom sirf tab jab button on ho: cursor (ya ungli) jahan ho wahan se zoom
  const zoomAt = (rect, clientX, clientY) => {
    setZoom({
      on: true,
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    });
  };

  const onMouseMove = (e) => {
    if (!zoomMode) return;
    zoomAt(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
  };

  const onTouchMove = (e) => {
    if (!zoomMode || !e.touches[0]) return;
    zoomAt(e.currentTarget.getBoundingClientRect(), e.touches[0].clientX, e.touches[0].clientY);
  };

  const stopZoom = () => setZoom((z) => ({ ...z, on: false }));

  const onKey = (e) => {
    if (total < 2) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };

  if (total === 0) {
    return (
      <div className="gallery single">
        <div className="g-main">
          <div className="p-noimg big">
            <i className="fa-solid fa-image" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`gallery ${total === 1 ? "single" : ""}`}>
      <div
        className={`g-main ${zoomMode ? "zoom-on" : ""} ${zoom.on ? "zoomed" : ""}`}
        tabIndex={0}
        onKeyDown={onKey}
        onMouseMove={onMouseMove}
        onMouseLeave={stopZoom}
        onTouchMove={onTouchMove}
      >
        <img
          src={imgUrl(images[index])}
          alt={alt}
          draggable={false}
          style={{
            transformOrigin: `${zoom.x}% ${zoom.y}%`,
            transform: zoomMode && zoom.on ? `scale(${ZOOM})` : "scale(1)",
            transition: zoom.on ? "transform 0.12s ease-out" : "transform 0.35s ease",
          }}
        />

        <button
          type="button"
          className={`g-zoom-btn ${zoomMode ? "active" : ""}`}
          onClick={toggleZoom}
          aria-pressed={zoomMode}
        >
          <i className={`fa-solid ${zoomMode ? "fa-magnifying-glass-minus" : "fa-magnifying-glass-plus"}`} />
          {zoomMode ? "Zoom band karein" : "Zoom"}
        </button>

        {total > 1 && (
          <>
            <button type="button" className="g-nav prev" onClick={() => go(-1)} aria-label="Pichli tasveer">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button type="button" className="g-nav next" onClick={() => go(1)} aria-label="Agli tasveer">
              <i className="fa-solid fa-chevron-right" />
            </button>
            <span className="g-count">
              {index + 1} / {total}
            </span>
          </>
        )}

        {zoomMode && !zoom.on && <span className="g-hint">Tasveer par cursor ghumayen</span>}
      </div>

      {total > 1 && (
        <div className="g-thumbs">
          {images.map((u, i) => (
            <button key={`${u}-${i}`} type="button" className={i === index ? "active" : ""} onClick={() => setIndex(i)}>
              <img src={imgUrl(u)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}