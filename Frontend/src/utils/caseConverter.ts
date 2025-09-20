import { isObject, isArray } from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = { [key: string]: any };

/**
 * Recursively converts object keys from snake_case to camelCase.
 * @param obj The object to convert.
 * @returns A new object with camelCase keys.
 */
export const toCamelCase = <T extends AnyObject | AnyObject[]>(obj: T): T => {
  if (isArray(obj)) {
    return obj.map(v => toCamelCase(v)) as T;
  }

  if (isObject(obj)) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/ig, $1 =>
        $1.toUpperCase().replace('-', '').replace('_', '')
      );
      result[camelKey as keyof T] = toCamelCase(obj[key]);
      return result;
    }, {} as T);
  }

  return obj;
};

/**
 * Recursively converts object keys from camelCase to snake_case.
 * @param obj The object to convert.
 * @returns A new object with snake_case keys.
 */
export const toSnakeCase = <T extends AnyObject | AnyObject[]>(obj: T): T => {
  if (isArray(obj)) {
    return obj.map(v => toSnakeCase(v)) as T;
  }

  if (isObject(obj)) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey as keyof T] = toSnakeCase(obj[key]);
      return result;
    }, {} as T);
  }

  return obj;
};
