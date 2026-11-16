import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Sparkles,
  Upload,
  X,
  Check,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "../context/Store";
import { listingService, aiService } from "../services";
import { types, amenities } from "../data/properties";
import { Button, Field, Empty } from "../components/UI";
export default function PropertyForm() {
  const { id } = useParams(),
    { listings, user, refresh } = useStore(),
    existing = listings.find((p) => p.id === id && p.hostId === user.id);
  const [f, setF] = useState(() =>
      existing
        ? { ...existing }
        : {
            name: "",
            location: "",
            type: "Villa",
            bedrooms: 1,
            bathrooms: 1,
            guests: 2,
            price: "",
            amenities: [],
            images: [],
            description: "",
            highlights: "",
          },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [generating, setGenerating] = useState(false),
    [drag, setDrag] = useState(false);
  const navigate = useNavigate();
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  if (id && !existing)
    return (
      <Empty
        title="Listing not found"
        text="Choose a listing from your own collection."
      >
        <Button to="/host/listings">My listings</Button>
      </Empty>
    );
  async function upload(files) {
    setError("");
    setUploading(true);
    try {
      if (f.images.length + files.length > 6)
        throw Error("Choose up to 6 images per property.");
      const images = await Promise.all(
        [...files].map(
          (file) =>
            new Promise((resolve, reject) => {
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              )
                return reject(Error("Use JPEG, PNG, or WebP images."));
              if (file.size > 2 * 1024 * 1024)
                return reject(Error("Each image must be smaller than 2 MB."));
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = () => reject(Error("Unable to read this image."));
              r.readAsDataURL(file);
            }),
        ),
      );
      setF((prev) => ({ ...prev, images: [...prev.images, ...images] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  async function generate() {
    setGenerating(true);
    setError("");
    try {
      set("description", (await aiService.generateListingDescription(f)).data);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const status = e.nativeEvent.submitter?.value || "draft";
      if (status === "active" && (!f.images.length || !f.description.trim()))
        throw Error(
          "Add at least one image and a description before publishing.",
        );
      const p = {
        ...f,
        id: existing?.id || crypto.randomUUID(),
        hostId: user.id,
        price: +f.price,
        bedrooms: +f.bedrooms,
        bathrooms: +f.bathrooms,
        guests: +f.guests,
        blocks: existing?.blocks || [],
        createdAt: existing?.createdAt || Date.now(),
        status,
      };
      await listingService.save(p);
      refresh();
      navigate("/host/listings");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/host/listings">
        <ArrowLeft size={16} />
        Your listings
      </Link>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">A SPACE WORTH SHARING</span>
          <h1>
            {existing ? "Refine your space." : "Let your space tell its story."}
          </h1>
          <p>
            A few thoughtful details help the right people discover your
            property.
          </p>
        </div>
      </div>
      <form className="property-form" onSubmit={submit}>
        <section className="panel">
          <span className="eyebrow">01 · THE ESSENTIALS</span>
          <h2>Start with the basics</h2>
          <Field
            label="Property title"
            required
            value={f.name}
            maxLength={100}
            onChange={(e) => set("name", e.target.value)}
            placeholder="The Palm House"
          />
          <div className="field-row">
            <Field
              label="Location"
              required
              value={f.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Assagao, Goa"
            />
            <Field label="Property type">
              <select
                value={f.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="field-row three">
            {[
              ["bedrooms", "Bedrooms"],
              ["bathrooms", "Bathrooms"],
              ["guests", "Maximum guests"],
            ].map(([k, label]) => (
              <Field
                key={k}
                label={label}
                type="number"
                required
                min="1"
                max="30"
                value={f[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            ))}
          </div>
          <Field
            label="Nightly price (INR)"
            type="number"
            min="100"
            required
            value={f.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="5000"
          />
        </section>
        <section className="panel">
          <span className="eyebrow">02 · THE LITTLE EXTRAS</span>
          <h2>What makes it feel like home?</h2>
          <div className="amenity-checkboxes">
            {amenities.map((a) => (
              <label className="checkbox" key={a}>
                <input
                  type="checkbox"
                  checked={f.amenities.includes(a)}
                  onChange={(e) =>
                    set(
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
          </div>
          <Field label="Property highlights (optional)">
            <textarea
              value={f.highlights || ""}
              onChange={(e) => set("highlights", e.target.value)}
              placeholder="Share only factual details about your space."
            />
          </Field>
        </section>
        <section className="panel">
          <span className="eyebrow">03 · A WINDOW INTO YOUR SPACE</span>
          <h2>Let the pictures do the talking</h2>
          <label
            className={"upload-area " + (drag ? "drag" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files);
            }}
          >
            <Upload size={28} />
            <b>
              {uploading
                ? "Preparing your images…"
                : "Drop your favourite views here"}
            </b>
            <span>
              or click to choose · JPEG, PNG, WebP · Up to 2 MB each · 6 images
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={uploading}
            />
          </label>
          <div className="upload-previews">
            {f.images.map((image, i) => (
              <div key={i}>
                <img src={image} alt={"Listing preview " + (i + 1)} />
                <button
                  aria-label={"Remove image " + (i + 1)}
                  className="icon-button"
                  type="button"
                  onClick={() =>
                    set(
                      "images",
                      f.images.filter((_, j) => i !== j),
                    )
                  }
                >
                  <X size={16} />
                </button>
                <small>
                  <Check size={12} />
                  Ready · local preview
                </small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">04 · PUT IT INTO WORDS</span>
              <h2>Your space, your story</h2>
            </div>
            <Button
              type="button"
              className="secondary"
              disabled={generating}
              onClick={generate}
            >
              {generating ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              Generate Description with AI
            </Button>
          </div>
          <Field label="Property description">
            <textarea
              className="description-input"
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the space and what guests can expect…"
            />
          </Field>
          <p className="muted">
            Mock generation uses only the facts you provide. Edit freely;
            generating never publishes your listing.
          </p>
        </section>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-bottom">
          <Link to="/host/listings">Cancel</Link>
          <div className="actions">
            <Button
              className="secondary"
              name="status"
              value="draft"
              type="submit"
              disabled={busy || uploading}
            >
              Save draft
            </Button>
            <Button
              name="status"
              value="active"
              type="submit"
              disabled={busy || uploading}
            >
              Publish demo listing
              <ArrowLeft className="rotate" size={16} />
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
