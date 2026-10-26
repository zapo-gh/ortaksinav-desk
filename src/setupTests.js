// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';



vi.mock('@dnd-kit/core', async (importOriginal) => ({
  ...(await importOriginal()),
  DndContext: ({ children }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
  }),
}));

vi.mock('@dnd-kit/sortable', async (importOriginal) => ({
  ...(await importOriginal()),
  SortableContext: ({ children }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
  }),
}));

// Tauri IPC testlerde yok; her komut boş sonuç döndürür.
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => null),
}));

// jsdom scrollIntoView'u uygulamaz.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}


beforeEach(() => {
  const matchMediaMock = vi.fn(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaMock,
  });

  global.matchMedia = matchMediaMock;
});


// Mock TextEncoder/TextDecoder if missing (Node environment usually has them, but JSDOM might need polyfill)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Firebase kaldırıldı - tüm veriler yerel SQLite üzerinde saklanmaktadır
// (Firebase mock'ları artık gereksizdir)