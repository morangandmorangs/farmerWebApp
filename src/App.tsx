import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";

import Crops from "@/pages/Crops";
import Farm from "@/pages/Farm";
import Login from "@/pages/Login";

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Farm />} />
        <Route path='crops' element={<Crops />} />
        {/* Old links (the removed Documents page among them) land on the farm. */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Route>
    </Routes>
  );
}
