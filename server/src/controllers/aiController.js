export function createAiController(aiService) {
  return {
    async search(req, res, next) {
      try {
        const { prompt } = req.body || {};
        const result = await aiService.searchListings(prompt);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    async description(req, res, next) {
      try {
        const result = await aiService.generateListingDescription(req.body);
        res.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}
