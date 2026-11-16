export function createFavoriteController(service) {
  return {
    getFavorites: async (req, res, next) => {
      try {
        const result = await service.getFavorites(req.user.id);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    getFavoriteIds: async (req, res, next) => {
      try {
        const ids = await service.getFavoriteIds(req.user.id);
        res.json({ data: ids });
      } catch (error) {
        next(error);
      }
    },

    addFavorite: async (req, res, next) => {
      try {
        const result = await service.addFavorite(
          req.user.id,
          req.params.listingId
        );
        res.status(201).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    removeFavorite: async (req, res, next) => {
      try {
        const result = await service.removeFavorite(
          req.user.id,
          req.params.listingId
        );
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    toggleFavorite: async (req, res, next) => {
      try {
        const result = await service.toggleFavorite(
          req.user.id,
          req.params.listingId
        );
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
