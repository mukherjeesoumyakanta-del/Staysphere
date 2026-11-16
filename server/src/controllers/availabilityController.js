export function createAvailabilityController(service) {
  return {
    getBlocks: async (req, res, next) => {
      try {
        const blocks = await service.getBlocks(req.params.listingId);
        res.json({ data: blocks });
      } catch (error) {
        next(error);
      }
    },

    addBlock: async (req, res, next) => {
      try {
        const block = await service.addBlock(
          req.params.listingId,
          req.user.id,
          req.body
        );
        res.status(201).json({ data: block });
      } catch (error) {
        next(error);
      }
    },

    removeBlock: async (req, res, next) => {
      try {
        const result = await service.removeBlock(
          req.params.blockId,
          req.user.id
        );
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    checkAvailability: async (req, res, next) => {
      try {
        const checkIn = req.query.checkIn || req.query.start;
        const checkOut = req.query.checkOut || req.query.end;
        const result = await service.checkAvailability(
          req.params.listingId,
          checkIn,
          checkOut
        );
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
