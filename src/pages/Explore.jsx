import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { listingApiService } from "../services/listingApiService";
import { types, amenities } from "../data/properties";
import { PropertyGrid, Button, Field } from "../components/UI";

/** Skeleton card matching .property-card dimensions */
function SkeletonCard() {
  return (
    <div className="property-card skeleton-card">
      <div className="skeleton" style={{ height: "220px", borderRadius: "var(--radius, 12px)" }} />
      <div style={{ padding: "1rem" }}>
        <div className="skeleton" style={{ height: "12px", width: "60%", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "18px", width: "80%", marginBottom: "12px" }} />
        <div className="skeleton" style={{ height: "12px", width: "40%" }} />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="property-grid">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <SkeletonCard key={n} />
      ))}
    </div>
  );
}

export default function Explore() {
  const [params] = useSearchParams();
  const [f, setF] = useState(() => ({
    q: params.get("q") || "",
    min: params.get("min") || "",
    max: params.get("max") || "",
    guests: params.get("guests") || "",
    bedrooms: "",
    type: "",
    amenities: [],
    sort: "new",
  }));
  const [drawer, setDrawer] = useState(false);

  // API state
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchListings = useCallback(
    async (filters, pg) => {
      setLoading(true);
      setError("");
      try {
        const result = await listingApiService.getListings({ ...filters, page: pg });
        const data = result.data;
        setListings(data.listings);
        setTotal(data.total);
        setPage(data.page);
        setPages(data.pages);
      } catch (e) {
        setError(e.message || "Failed to load listings.");
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch on mount and whenever filters change (debounced for text)
  useEffect(() => {
    const timer = setTimeout(() => fetchListings(f, 1), f.q ? 400 : 0);
    return () => clearTimeout(timer);
  }, [f, fetchListings]);

  const change = (k, v) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setPage(1);
  };

  const goToPage = (pg) => {
    fetchListings(f, pg);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="explore-page section">
      <div className="page-intro">
        <span className="eyebrow">A SPACE FOR EVERY KIND OF YOU</span>
        <h1>
          Find your next <em>somewhere.</em>
        </h1>
        <p>Thoughtfully chosen stays, across places you'll love.</p>
      </div>
      <div className="explore-search">
        <Search size={20} />
        <input
          aria-label="Search properties"
          placeholder="Search a destination or a beautiful space…"
          value={f.q}
          onChange={(e) => change("q", e.target.value)}
        />
        <Button className="secondary" onClick={() => setDrawer(!drawer)}>
          <SlidersHorizontal size={17} />
          Filters
        </Button>
      </div>
      <div className="explore-layout">
        <aside className={"filters " + (drawer ? "drawer-open" : "")}>
          <div className="filter-title">
            <h3>Make it yours</h3>
            <button
              className="icon-button"
              onClick={() =>
                setF({ q: "", min: "", max: "", guests: "", bedrooms: "", type: "", amenities: [], sort: "new" })
              }
            >
              Reset
            </button>
            <button
              className="mobile-toggle icon-button"
              aria-label="Close filters"
              onClick={() => setDrawer(false)}
            >
              <X />
            </button>
          </div>
          <div className="field-row">
            <Field
              label="Min ₹ / night"
              type="number"
              min="0"
              value={f.min || ""}
              onChange={(e) => change("min", e.target.value)}
            />
            <Field
              label="Max ₹ / night"
              type="number"
              min="0"
              value={f.max || ""}
              onChange={(e) => change("max", e.target.value)}
            />
          </div>
          <Field label="Guests">
            <select
              value={f.guests || ""}
              onChange={(e) => change("guests", e.target.value)}
            >
              <option value="">Any group size</option>
              {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}+ guests
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bedrooms">
            <select
              value={f.bedrooms || ""}
              onChange={(e) => change("bedrooms", e.target.value)}
            >
              <option value="">Any bedrooms</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}+ bedrooms
                </option>
              ))}
            </select>
          </Field>
          <Field label="Property type">
            <select
              value={f.type || ""}
              onChange={(e) => change("type", e.target.value)}
            >
              <option value="">All spaces</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <h4>The little extras</h4>
          {amenities.map((a) => (
            <label className="checkbox" key={a}>
              <input
                type="checkbox"
                checked={f.amenities.includes(a)}
                onChange={(e) =>
                  change(
                    "amenities",
                    e.target.checked
                      ? [...f.amenities, a]
                      : f.amenities.filter((x) => x !== a),
                  )
                }
              />
              {a}
            </label>
          ))}
          <Button
            className="filter-done mobile-toggle"
            onClick={() => setDrawer(false)}
          >
            Show {total} stays
            <ArrowRight size={16} />
          </Button>
        </aside>
        <div className="results">
          <div className="result-toolbar">
            <span>
              <b>{loading ? "…" : total}</b> spaces to call your own
            </span>
            <select
              aria-label="Sort properties"
              value={f.sort || "new"}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="new">Newest spaces</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {loading ? (
            <SkeletonGrid />
          ) : listings.length === 0 ? (
            <div className="empty">
              <h2>No spaces found</h2>
              <p>Try a different destination or loosen your filters.</p>
            </div>
          ) : (
            <PropertyGrid properties={listings} />
          )}
          {/* Pagination */}
          {!loading && pages > 1 && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                marginTop: "2rem",
                flexWrap: "wrap",
              }}
            >
              {page > 1 && (
                <Button className="secondary" onClick={() => goToPage(page - 1)}>
                  ← Previous
                </Button>
              )}
              {Array.from({ length: pages }, (_, i) => i + 1).map((pg) => (
                <Button
                  key={pg}
                  className={pg === page ? "" : "secondary"}
                  onClick={() => goToPage(pg)}
                >
                  {pg}
                </Button>
              ))}
              {page < pages && (
                <Button className="secondary" onClick={() => goToPage(page + 1)}>
                  Next →
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
