// scripts/state.js

const State = (function () {
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

  function getState() {
    // Return a shallow copy of state
    return Object.assign({}, state);
  }

  function setState(newState) {
    Object.assign(state, newState);
  }

  return {
    getState: getState,
    setState: setState,
  };
})();

window.State = State;



