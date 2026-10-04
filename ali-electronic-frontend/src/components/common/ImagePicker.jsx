import { useEffect, useRef, useState } from "react";
import { imgUrl } from "../../utils/format.js";

// currentUrl = pehle se save image, file = nayi select ki hui image
export default function ImagePicker({ label = "Image", currentUrl, file, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const src = preview || imgUrl(currentUrl);

  const pick = (f) => {
    if (f && f.type.startsWith("image/")) onChange(f);
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        {src ? (
          <img src={src} alt="" className="dz-preview" />
        ) : (
          <div className="dz-icon">
            <i className="fa-solid fa-cloud-arrow-up" />
          </div>
        )}

        <div className="dz-text">
          <strong>{file ? file.name : src ? "Image badalne ke liye click karein" : "Image select karein"}</strong>
          <span>Click karein ya image yahan drag karein (JPG, PNG, WEBP, max 5MB)</span>
        </div>

        {file && (
          <button
            type="button"
            className="icon-btn"
            title="Select ki hui image hatayen"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}