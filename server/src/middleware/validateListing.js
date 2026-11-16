const VALID_PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Cabin",
  "Cottage",
  "Studio",
  "Farmhouse",
  "Treehouse",
  "Houseboat",
];

const VALID_AMENITIES = [
  "WiFi",
  "Pool",
  "AC",
  "Kitchen",
  "Parking",
  "Gym",
  "Beach Access",
  "Pet Friendly",
  "Breakfast",
  "Hot Tub",
];

const KNOWN_FIELDS = [
  "title",
  "description",
  "city",
  "state",
  "location",
  "propertyType",
  "pricePerNight",
  "maxGuests",
  "bedrooms",
  "bathrooms",
  "amenities",
  "status",
];

function validateFields(body, isCreate) {
  const fields = {};
  const validated = {};

  // Helper validators
  const requireString = (key, min, max) => {
    const val = body[key];
    if (val === undefined || val === null) {
      if (isCreate) fields[key] = `${key} is required`;
      return;
    }
    if (typeof val !== "string") {
      fields[key] = `${key} must be a string`;
      return;
    }
    const trimmed = val.trim();
    if (trimmed.length < min) {
      fields[key] = `${key} must be at least ${min} characters`;
      return;
    }
    if (trimmed.length > max) {
      fields[key] = `${key} must be at most ${max} characters`;
      return;
    }
    validated[key] = trimmed;
  };

  const requireInt = (key, min, max) => {
    const val = body[key];
    if (val === undefined || val === null) {
      if (isCreate) fields[key] = `${key} is required`;
      return;
    }
    const num = Number(val);
    if (!Number.isInteger(num)) {
      fields[key] = `${key} must be an integer`;
      return;
    }
    if (num < min) {
      fields[key] = `${key} must be at least ${min}`;
      return;
    }
    if (num > max) {
      fields[key] = `${key} must be at most ${max}`;
      return;
    }
    validated[key] = num;
  };

  const requireNumber = (key, min, max) => {
    const val = body[key];
    if (val === undefined || val === null) {
      if (isCreate) fields[key] = `${key} is required`;
      return;
    }
    const num = Number(val);
    if (isNaN(num)) {
      fields[key] = `${key} must be a number`;
      return;
    }
    if (num < min) {
      fields[key] = `${key} must be at least ${min}`;
      return;
    }
    if (num > max) {
      fields[key] = `${key} must be at most ${max}`;
      return;
    }
    validated[key] = num;
  };

  // String fields
  if (isCreate || body.title !== undefined) requireString("title", 3, 120);
  if (isCreate || body.description !== undefined)
    requireString("description", 10, 2000);
  if (isCreate || body.city !== undefined) requireString("city", 2, 80);
  if (isCreate || body.state !== undefined) requireString("state", 2, 80);
  if (isCreate || body.location !== undefined)
    requireString("location", 1, 500);

  // propertyType
  if (body.propertyType !== undefined || isCreate) {
    if (body.propertyType === undefined && isCreate) {
      fields.propertyType = "propertyType is required";
    } else if (body.propertyType !== undefined) {
      if (!VALID_PROPERTY_TYPES.includes(body.propertyType)) {
        fields.propertyType = `propertyType must be one of: ${VALID_PROPERTY_TYPES.join(", ")}`;
      } else {
        validated.propertyType = body.propertyType;
      }
    }
  }

  // Numeric fields
  if (isCreate || body.pricePerNight !== undefined)
    requireInt("pricePerNight", 1, Number.MAX_SAFE_INTEGER);
  if (isCreate || body.maxGuests !== undefined)
    requireInt("maxGuests", 1, 20);
  if (isCreate || body.bedrooms !== undefined) requireInt("bedrooms", 0, 20);
  if (isCreate || body.bathrooms !== undefined)
    requireNumber("bathrooms", 0, 20);

  // amenities (optional even on create)
  if (body.amenities !== undefined) {
    let list = body.amenities;
    if (typeof list === "string") {
      list = list.includes(",")
        ? list.split(",").map((s) => s.trim()).filter(Boolean)
        : [list];
    }
    if (!Array.isArray(list)) {
      fields.amenities = "amenities must be an array";
    } else {
      const invalid = list.filter(
        (a) => !VALID_AMENITIES.includes(a)
      );
      if (invalid.length > 0) {
        fields.amenities = `Invalid amenities: ${invalid.join(", ")}`;
      } else {
        validated.amenities = list;
      }
    }
  }

  // status (optional, only 'DRAFT' or 'ACTIVE')
  if (body.status !== undefined) {
    if (!["DRAFT", "ACTIVE"].includes(body.status)) {
      fields.status = "status must be DRAFT or ACTIVE";
    } else {
      validated.status = body.status;
    }
  }

  return { fields, validated };
}

export function validateListing(action) {
  const isCreate = action === "create";
  return (req, res, next) => {
    const { fields, validated } = validateFields(req.body || {}, isCreate);

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          fields,
        },
      });
    }

    req.validated = validated;
    next();
  };
}
