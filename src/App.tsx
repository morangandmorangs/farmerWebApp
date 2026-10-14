import { BrowserRouter, Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import Crops from "@/pages/Crops";
import Documents from "@/pages/Documents";
import Farm from "@/pages/Farm";
import Login from "@/pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Farm />} />
            <Route path="crops" element={<Crops />} />
            <Route path="documents" element={<Documents />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
    </AuthProvider>
  );
}
