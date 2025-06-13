export const flushPromises = () => new Promise((resolve) => {
  setImmediate(resolve);
});

export const fail = (message: string) => {
  throw new Error(message);
};
