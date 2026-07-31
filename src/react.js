/* React comes from the UMD script tags in index.html — no bundler needed. */
const React = window.React;
if (!React) throw new Error("React failed to load");
export default React;
export const h = React.createElement;
export const Fragment = React.Fragment;
export const {
  useState, useEffect, useMemo, useCallback, useRef, useContext, createContext,
} = React;
