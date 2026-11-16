export function createBookingController(service) {
  return {
    create: async (req, res, next) => {
      try {
        const booking = await service.create(req.user.id, req.body);
        res.status(201).json({ data: booking });
      } catch (error) {
        next(error);
      }
    },

    myBookings: async (req, res, next) => {
      try {
        const bookings = await service.getMyBookings(req.user.id);
        res.json({ data: bookings });
      } catch (error) {
        next(error);
      }
    },

    hostBookings: async (req, res, next) => {
      try {
        const bookings = await service.getHostBookings(req.user.id);
        res.json({ data: bookings });
      } catch (error) {
        next(error);
      }
    },

    getOne: async (req, res, next) => {
      try {
        const booking = await service.getBooking(req.params.id, req.user.id);
        res.json({ data: booking });
      } catch (error) {
        next(error);
      }
    },

    cancel: async (req, res, next) => {
      try {
        const booking = await service.cancelBooking(req.params.id, req.user.id);
        res.json({ data: booking });
      } catch (error) {
        next(error);
      }
    },
  };
}
