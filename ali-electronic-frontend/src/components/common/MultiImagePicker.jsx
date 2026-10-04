import { useEffect, useRef, useState } from "react";
import { imgUrl } from "../../utils/format.js";

const uid = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * items = [{ key, id?, url?, file?, preview? }]
 *  - id + url   : pehle se lagi hui tasveer
 *  - file       : abhi chuni hui nayi tasveer
 * List ka tarteeb hi final tarteeb hai, pehli tasveer main hoti hai.
 */
export default function MultiImagePicker({ label = "Product ki tasveerein", items, onChange, max = 6 }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  // component band hone par preview links saaf karo
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => latest.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const addFiles = (list) => {
    const room = max - items.length;
    const picked = Array.from(list || [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, Math.max(room, 0));
    if (!picked.length) return;
    onChange([...items, ...picked.map((file) => ({ key: uid(), file, preview: URL.createObjectURL(file) }))]);
  };

  const remove = (index) => {
    const item = items[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="field">
      <label>
        {label} <small className="muted">(pehli tasveer main hogi, zyada se zyada {max})</small>
      </label>

      <div className="mi-grid">
        {items.map((item, i) => (
          <div key={item.key} className="mi-tile">
            <img src={item.preview || imgUrl(item.url)} alt="" />
            {i === 0 && <span className="mi-main">Main</span>}
            <div className="mi-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Pehle laayen">
                <i className="fa-solid fa-chevron-left" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Baad me bhejen">
                <i className="fa-solid fa-chevron-right" />
              </button>
              <button type="button" className="del" onClick={() => remove(i)} title="Hatayen">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>
        ))}

        {items.length < max && (
          <div
            className={`mi-add ${drag ? "drag" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <i className="fa-solid fa-cloud-arrow-up" />
            <span>Tasveer add karein</span>
            <small>Click ya drag</small>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}