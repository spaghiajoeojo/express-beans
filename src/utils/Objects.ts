
const nonNullish = <T>(value: T): value is NonNullable<T> => value !== null && value !== undefined;

export const Objects = {
  nonNullish,
};
