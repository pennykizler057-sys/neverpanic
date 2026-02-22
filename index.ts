export type Result<T = unknown, E = unknown> =
  | {
      success: true;
      data: T;
    }
  | { success: false; error: E };

/**
 * Create a neverpanic instance with strictly typed Error and Data constraints.
 *
 * @returns A neverpanic instance with all functions constrained to the specified types.
 *
 * @example
 * type MyData = { id: string; name: string };
 * type MyError = "NOT_FOUND" | "UNAUTHORIZED" | "SERVER_ERROR";
 *
 * const myN = createNeverpanic<MyData, MyError>();
 *
 * // Now myN.ok only accepts MyData
 * const result = myN.ok({ id: "123", name: "John" });
 *
 * // And myN.err only accepts MyError
 * const error = myN.err("NOT_FOUND");
 */
export function createNeverpanic<
  D = unknown,
  E = unknown,
>() {
  const ok = <const T extends D>(
    data: T,
  ): Result<T, never> => ({
    success: true,
    data,
  });

  const err = <const T extends E>(
    error: T,
  ): Result<never, T> => ({
    success: false,
    error,
  });

  function safeFn<
    T extends Result<D, E> | Promise<Result<D, E>>,
    A extends unknown[],
    EH extends E = E,
  >(
    cb: (...args: A) => T,
    eh: (e: unknown) => EH,
  ): (...args: A) => T | { success: false; error: EH } {
    const createErrorResult = (e: unknown) =>
      ({
        success: false,
        error: eh(e),
      }) as const;

    return (...args) => {
      try {
        const result = cb(...args);

        if (result instanceof Promise)
          return result.catch(createErrorResult) as T;

        return result;
      } catch (e) {
        return createErrorResult(e) as {
          success: false;
          error: EH;
        };
      }
    };
  }

  function fromUnsafe<
    T,
    EH extends E = E,
    R = T extends Promise<infer U>
      ? Promise<Result<U extends D ? U : never, EH>>
      : T extends D
        ? Result<T, EH>
        : never,
  >(cb: () => T, eh: (err: unknown) => EH): R {
    const createErrorResult = (e: unknown) => ({
      success: false,
      error: eh(e),
    });

    const createSuccessResult = (data: T) =>
      ({
        success: true,
        data,
      }) as const;

    try {
      const result = cb();

      if (result instanceof Promise)
        return result
          .then(createSuccessResult)
          .catch(createErrorResult) as R;

      return createSuccessResult(result) as R;
    } catch (e) {
      return createErrorResult(e) as R;
    }
  }

  const resultsToResult = <
    T extends Result<D, E>[],
    TD extends Extract<T[number], { success: true }>,
    TE extends Extract<T[number], { success: false }>,
  >(
    results: T,
  ): Result<TD[], TE[]> => {
    const errors = results.filter(
      (result): result is TE => !result.success,
    );

    if (errors.length)
      return {
        success: false,
        error: errors,
      };

    const successes = results.filter(
      (result): result is TD => result.success,
    );

    return {
      success: true,
      data: successes,
    };
  };

  return {
    ok,
    err,
    safeFn,
    fromUnsafe,
    resultsToResult,
  };
}

export const n = createNeverpanic();
