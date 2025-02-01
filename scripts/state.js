// scripts/state.js

const State = (() => {
  const state = {
    openScreenshot: false,
    openOcrText: false,
    tesseractReady: false,
    selection: {
      isSelecting: false,
      startX: 0,
      startY: 0,
      selectionRect: null,
    },
  };

  const getState = () => ({ ...state });
  const setState = (newState) => {
    Object.assign(state, newState);
  };

  return {
    getState,
    setState,
  };
})();

// Make State available globally
window.State = State;

