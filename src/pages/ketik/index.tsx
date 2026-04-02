import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppKetik from './AppKetik';

export default function KetikApp() {
  return (
    <Routes>
      <Route path="/*" element={<AppKetik />} />
    </Routes>
  );
}
