export const flushPromises = () => new Promise((resolve) => {
  setImmediate(resolve);
});

export const fail = (message) => {
  throw new Error(message);
};
