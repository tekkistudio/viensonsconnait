// jest.setup.js

import '@testing-library/jest-dom';

// Mock Next/Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: require('react').forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock window.fs
global.window = Object.create(window);
Object.defineProperty(window, 'fs', {
  value: {
    readFile: jest.fn(),
  },
});

// Setup Intersection Observer mock
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;