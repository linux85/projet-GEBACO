import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for React DOM removeChild/insertBefore error caused by Google Translate / browser extensions
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Prevented DOM removeChild crash: node is not a child of parent', child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Prevented DOM insertBefore crash: referenceNode is not a child of parent', referenceNode);
      }
      return originalInsertBefore.apply(this, [newNode, null]) as T;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

