import { useState, useEffect } from "react";
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
import { listingApiService } from "../services/listingApiService";
import { aiService } from "../services";
import { types, amenities } from "../data/properties";
import { Button, Field, Empty } from "../components/UI";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_IMAGES = 6;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Validate a File and return an error string or null */
function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Use JPEG, PNG, or WebP images.";
  if (file.size > MAX_SIZE)
    return "Each image must be smaller than 4 MB.";
  return null;
}

/** Preview item — either a File (new) or an existing URL string */
function PreviewItem({ src, label, isNew, onRemove }) {
  return (
    <div>
      <img src={src} alt={label} />
      <button
        aria-label={label}
        className="icon-button"
        type="button"
        onClick={onRemove}
      >
        <X size={16} />
      </button>
      <small>
        <Check size={12} />
        {isNew ? "Ready · local preview" : "Uploaded"}
      </small>
    </div>
  );
}

export default function PropertyForm() {
  const { id } = useParams();
  const { user, refreshApiListings } = useStore();
  const navigate = useNavigate();

  // Existing listing from API (edit mode)
  const [existingListing, setExistingListing] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(!!id);
  const [notFound, setNotFound] = useState(false);

  // Form fields
  const [f, setF] = useState({
    title: "",
    city: "",
    state: "",
    location: "",
    propertyType: "Villa",
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    pricePerNight: "",
    amenities: [],
    description: "",
    highlights: "",
    status: "DRAFT",
  });

  // Image state: existing URLs (from API) + new File objects
  const [existingImages, setExistingImages] = useState([]); // [{url, publicId}]
  const [newFiles, setNewFiles] = useState([]); // File[]
  const [newPreviews, setNewPreviews] = useState([]); // data URL strings

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitAction, setSubmitAction] = useState("DRAFT");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [drag, setDrag] = useState(false);

  // Load existing listing for edit
  useEffect(() => {
    if (!id) return;
    setLoadingExisting(true);
    listingApiService
      .getListingById(id)
      .then((result) => {
        const p = result.data;
        // Verify host owns this
        if (!p) { setNotFound(true); return; }
        setExistingListing(p);
        setExistingImages(p._images || []);
        setF({
          title: p.name || "",
          city: p.city || "",
          state: p.state || "",
          location: p.location || "",
          propertyType: p.type || "Villa",
          bedrooms: p.bedrooms || 1,
          bathrooms: p.bathrooms || 1,
          maxGuests: p.guests || 2,
          pricePerNight: p.price || "",
          amenities: p.amenities || [],
          description: p.description || "",
          highlights: p.highlights || "",
          status: (p.status || "draft").toUpperCase(),
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingExisting(false));
  }, [id]);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const totalImages = existingImages.length + newFiles.length;

  async function upload(files) {
    setError("");
    setUploading(true);
    try {
      const fileArr = [...files];
      if (totalImages + fileArr.length > MAX_IMAGES)
        throw Error(`Choose up to ${MAX_IMAGES} images per property.`);
      const errors = fileArr.map(validateFile).filter(Boolean);
      if (errors.length) throw Error(errors[0]);

      // Build previews
      const previews = await Promise.all(
        fileArr.map(
          (file) =>
            new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = () => reject(Error("Unable to read this image."));
              r.readAsDataURL(file);
            }),
        ),
      );
      setNewFiles((prev) => [...prev, ...fileArr]);
      setNewPreviews((prev) => [...prev, ...previews]);
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
      // Build a shape compatible with the AI service
      const mockP = {
        name: f.title,
        location: f.location || [f.city, f.state].filter(Boolean).join(", "),
        type: f.propertyType,
        bedrooms: f.bedrooms,
        bathrooms: f.bathrooms,
        guests: f.maxGuests,
        amenities: f.amenities,
        highlights: f.highlights,
        price: f.pricePerNight,
      };
      set("description", (await aiService.generateListingDescription(mockP)).data);
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
      const submittedStatus = (
        submitAction ||
        e.nativeEvent?.submitter?.value ||
        "DRAFT"
      ).toUpperCase();

      if (!f.title.trim()) throw Error("Property title is required.");
      if (f.title.trim().length < 3)
        throw Error("Property title must be at least 3 characters.");
      if (!f.pricePerNight || Number(f.pricePerNight) < 1)
        throw Error("Nightly price must be at least ₹1.");
      if (!f.city.trim() && !f.location.trim())
        throw Error("City or location is required.");

      if (submittedStatus === "ACTIVE") {
        if (totalImages === 0)
          throw Error("Add at least one image before publishing.");
        if (!f.description || f.description.trim().length < 10)
          throw Error(
            "Please provide a description of at least 10 characters before publishing."
          );
      }

      const derivedCity =
        f.city.trim() || f.location.split(",")[0]?.trim() || "Assagao";
      const derivedState =
        f.state.trim() || f.location.split(",")[1]?.trim() || derivedCity;

      const fields = {
        title: f.title.trim(),
        city: derivedCity,
        state: derivedState,
        location:
          f.location.trim() ||
          [derivedCity, derivedState].filter(Boolean).join(", "),
        propertyType: f.propertyType,
        bedrooms: Math.max(0, parseInt(f.bedrooms, 10) || 0),
        bathrooms: Math.max(0, parseFloat(f.bathrooms) || 1),
        maxGuests: Math.max(1, parseInt(f.maxGuests, 10) || 1),
        pricePerNight: Math.round(Number(f.pricePerNight)),
        amenities: f.amenities,
        description:
          f.description.trim() ||
          (submittedStatus === "DRAFT"
            ? "Draft property listing in progress."
            : ""),
        status: submittedStatus,
      };
      if (f.highlights) fields.highlights = f.highlights;

      if (id) {
        await listingApiService.updateListing(id, fields, newFiles);
      } else {
        await listingApiService.createListing(fields, newFiles);
      }
      refreshApiListings();
      navigate("/host/listings");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loadingExisting)
    return (
      <div className="skeleton" style={{ height: "400px", margin: "2rem" }} />
    );

  if (id && notFound)
    return (
      <Empty
        title="Listing not found"
        text="Choose a listing from your own collection."
      >
        <Button to="/host/listings">My listings</Button>
      </Empty>
    );

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
            {existingListing ? "Refine your space." : "Let your space tell its story."}
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
            value={f.title}
            maxLength={120}
            onChange={(e) => set("title", e.target.value)}
            placeholder="The Palm House"
          />
          <div className="field-row">
            <Field
              label="City"
              required
              value={f.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Assagao"
            />
            <Field
              label="State"
              required
              value={f.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="Goa"
            />
          </div>
          <Field
            label="Full address / location"
            required
            value={f.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Assagao, Goa"
          />
          <Field label="Property type">
            <select
              value={f.propertyType}
              onChange={(e) => set("propertyType", e.target.value)}
            >
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <div className="field-row three">
            {[
              ["bedrooms", "Bedrooms"],
              ["bathrooms", "Bathrooms"],
              ["maxGuests", "Maximum guests"],
            ].map(([k, label]) => (
              <Field
                key={k}
                label={label}
                type="number"
                required
                min="0"
                max="20"
                value={f[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            ))}
          </div>
          <Field
            label="Nightly price (INR)"
            type="number"
            min="1"
            required
            value={f.pricePerNight}
            onChange={(e) => set("pricePerNight", e.target.value)}
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
              or click to choose · JPEG, PNG, WebP · Up to 4 MB each · {MAX_IMAGES} images max
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => upload(e.target.files)}
              disabled={uploading || totalImages >= MAX_IMAGES}
            />
          </label>
          <div className="upload-previews">
            {/* Existing uploaded images */}
            {existingImages.map((img, i) => (
              <PreviewItem
                key={"existing-" + i}
                src={img.url || img}
                label={"Remove uploaded image " + (i + 1)}
                isNew={false}
                onRemove={() =>
                  setExistingImages((prev) => prev.filter((_, j) => j !== i))
                }
              />
            ))}
            {/* New file previews */}
            {newPreviews.map((preview, i) => (
              <PreviewItem
                key={"new-" + i}
                src={preview}
                label={"Remove new image " + (i + 1)}
                isNew={true}
                onRemove={() => {
                  setNewFiles((prev) => prev.filter((_, j) => j !== i));
                  setNewPreviews((prev) => prev.filter((_, j) => j !== i));
                }}
              />
            ))}
          </div>
          {totalImages >= MAX_IMAGES && (
            <p className="muted">Maximum of {MAX_IMAGES} images reached.</p>
          )}
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
              value="DRAFT"
              type="submit"
              onClick={() => setSubmitAction("DRAFT")}
              disabled={busy || uploading}
            >
              {busy && submitAction === "DRAFT" ? (
                <LoaderCircle className="spin" size={16} />
              ) : null}
              Save draft
            </Button>
            <Button
              name="status"
              value="ACTIVE"
              type="submit"
              onClick={() => setSubmitAction("ACTIVE")}
              disabled={busy || uploading}
            >
              {busy && submitAction === "ACTIVE" ? (
                <LoaderCircle className="spin" size={16} />
              ) : null}
              Publish listing
              <ArrowLeft className="rotate" size={16} />
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
