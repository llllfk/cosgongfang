'use client';

import * as React from 'react';
import { ToastProvider } from './Toast';

export const ToastRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ToastProvider>{children}</ToastProvider>;
};
