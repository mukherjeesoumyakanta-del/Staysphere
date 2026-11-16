import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import {
  PublicLayout,
  ProtectedRoute,
  DashboardLayout,
} from "./components/Layout";
import { Loading } from "./components/UI";
const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore")),
  Property = lazy(() => import("./pages/Property")),
  Auth = lazy(() => import("./pages/Auth")),
  PropertyForm = lazy(() => import("./pages/PropertyForm"));
const guest = (name) =>
    lazy(() => import("./pages/Guest").then((m) => ({ default: m[name] }))),
  host = (name) =>
    lazy(() => import("./pages/Host").then((m) => ({ default: m[name] })));
const GuestDashboard = guest("GuestDashboard"),
  Favorites = guest("Favorites"),
  MyBookings = guest("MyBookings"),
  AIFinder = guest("AIFinder"),
  Profile = guest("Profile"),
  HostDashboard = host("HostDashboard"),
  Listings = host("Listings"),
  HostAvailability = host("HostAvailability"),
  HostReservations = host("HostReservations");
const About = lazy(() =>
    import("./pages/About").then((m) => ({ default: m.About })),
  ),
  NotFound = lazy(() =>
    import("./pages/About").then((m) => ({ default: m.NotFound })),
  );
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<Loading />}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/property/:id" element={<Property />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth signup />} />
            <Route element={<ProtectedRoute role="GUEST" />}>
              <Route element={<DashboardLayout role="GUEST" />}>
                <Route path="/guest/dashboard" element={<GuestDashboard />} />
                <Route path="/guest/bookings" element={<MyBookings />} />
                <Route path="/guest/favorites" element={<Favorites />} />
                <Route path="/guest/ai-finder" element={<AIFinder />} />
                <Route path="/guest/profile" element={<Profile />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute role="HOST" />}>
              <Route element={<DashboardLayout role="HOST" />}>
                <Route path="/host/dashboard" element={<HostDashboard />} />
                <Route path="/host/listings" element={<Listings />} />
                <Route path="/host/listings/new" element={<PropertyForm />} />
                <Route
                  path="/host/listings/:id/edit"
                  element={<PropertyForm />}
                />
                <Route
                  path="/host/availability"
                  element={<HostAvailability />}
                />
                <Route
                  path="/host/reservations"
                  element={<HostReservations />}
                />
                <Route path="/host/profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </motion.div>
      </Suspense>
    </MotionConfig>
  );
}
