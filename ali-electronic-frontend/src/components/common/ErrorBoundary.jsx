import { Component } from "react";

// Agar koi screen me code ka masla aa jaye to poora page khali na ho
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Screen error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container page">
        <div className="empty box">
          <i className="fa-solid fa-triangle-exclamation" />
          <h2 style={{ marginBottom: 6 }}>Kuch ghalat ho gaya</h2>
          <p>Is page me masla aa gaya. Dobara koshish karein.</p>
          <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn primary" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-rotate" /> Page dobara kholein
            </button>
            <button type="button" className="btn" onClick={() => window.location.assign("/")}>
              Home par jayen
            </button>
          </div>
        </div>
      </div>
    );
  }
}