import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppPdkt from './AppPdkt';

export default function PDKTApp() {
  return (
    <Routes>
      <Route path="/*" element={<AppPdkt />} />
    </Routes>
  );
}
