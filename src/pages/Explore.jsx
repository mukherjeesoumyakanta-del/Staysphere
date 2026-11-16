import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { useStore } from "../context/Store";
import { filterListings } from "../services";
import { types, amenities } from "../data/properties";
import { PropertyGrid, Button, Field } from "../components/UI";
export default function Explore() {
  const { listings } = useStore();
  const [params] = useSearchParams();
  const [f, setF] = useState(() => ({
      q: params.get("q") || "",
      max: params.get("max") || "",
      guests: params.get("guests") || "",
      amenities: [],
    })),
    [count, setCount] = useState(9),
    [drawer, setDrawer] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);
  const change = (k, v) => {
      setF({ ...f, [k]: v });
      setCount(9);
    },
    results = filterListings(listings, f);
  return (
    <main className="explore-page section">
      <div className="page-intro">
        <span className="eyebrow">A SPACE FOR EVERY KIND OF YOU</span>
        <h1>
          Find your next <em>somewhere.</em>
        </h1>
        <p>Thoughtfully chosen stays, across places you’ll love.</p>
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
              onClick={() => setF({ q: "", amenities: [] })}
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
            Show {results.length} stays
            <ArrowRight size={16} />
          </Button>
        </aside>
        <div className="results">
          <div className="result-toolbar">
            <span>
              <b>{results.length}</b> spaces to call your own
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
          {loading ? (
            <div className="property-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div className="skeleton" key={n} />
              ))}
            </div>
          ) : (
            <PropertyGrid properties={results.slice(0, count)} />
          )}{" "}
          {count < results.length && (
            <Button
              className="secondary load-more"
              onClick={() => setCount(count + 6)}
            >
              Discover more spaces
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
