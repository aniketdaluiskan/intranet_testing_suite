import { Routes, Route } from "./router";
import Portal from "./pages/Portal";
import AppRoute from "./pages/AppRoute";
import Autopilot from "./components/Autopilot";
import RefreshTimer from "./components/RefreshTimer";
import CommandPalette from "./components/CommandPalette";

export default function App() {
  return (
    <>
      <Autopilot />
      <RefreshTimer />
      <CommandPalette />
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/:appId/*" element={<AppRoute />} />
        <Route path="*" element={<Portal />} />
      </Routes>
    </>
  );
}
