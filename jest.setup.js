// jest.setup.js
import '@testing-library/jest-dom';
import 'isomorphic-fetch';

// Configuration globale de fetch
global.fetch = fetch;

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

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.fs
global.window = Object.create(window);
Object.defineProperty(window, 'fs', {
  value: {
    readFile: jest.fn().mockImplementation(() => Promise.resolve(new Uint8Array())),
  },
});

// Mock Mapbox GL
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    remove: jest.fn(),
    addControl: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    setCenter: jest.fn(),
    easeTo: jest.fn(),
    fitBounds: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  FullscreenControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  })),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn().mockReturnThis(),
  })),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'test_session_id',
          url: 'https://test.checkout.url'
        })
      }
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'test_session_id',
            payment_intent: 'test_payment_intent'
          }
        }
      })
    }
  }));
});

// Setup Intersection Observer mock
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;