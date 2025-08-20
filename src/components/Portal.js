// Portal.js
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

export default function Portal({ children }) {
  const el = useMemo(() => document.createElement('div'), []);
  useEffect(() => {
    el.style.position = 'relative';
    el.style.zIndex = 999999; // arriba de todo
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, [el]);
  return createPortal(children, el);
}