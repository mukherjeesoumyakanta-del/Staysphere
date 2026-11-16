export function createListingController(service) {
  return {
    list: async (req, res, next) => {
      try {
        const result = await service.search(req.query);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    getOne: async (req, res, next) => {
      try {
        const listing = await service.getOne(req.params.id);
        res.json({ data: listing });
      } catch (error) {
        next(error);
      }
    },

    hostListings: async (req, res, next) => {
      try {
        const listings = await service.getHostListings(req.user.id);
        res.json({ data: listings });
      } catch (error) {
        next(error);
      }
    },

    create: async (req, res, next) => {
      try {
        const listing = await service.create(
          req.user.id,
          req.validated,
          req.uploadedImages || []
        );
        res.status(201).json({ data: listing });
      } catch (error) {
        next(error);
      }
    },

    update: async (req, res, next) => {
      try {
        const listing = await service.update(
          req.params.id,
          req.user.id,
          req.validated,
          req.uploadedImages || []
        );
        res.json({ data: listing });
      } catch (error) {
        next(error);
      }
    },

    remove: async (req, res, next) => {
      try {
        await service.remove(req.params.id, req.user.id);
        res.json({ data: { id: req.params.id } });
      } catch (error) {
        next(error);
      }
    },
  };
}
