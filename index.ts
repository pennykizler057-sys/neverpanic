export type Result<T = unknown, E = unknown> =
  | {
      success: true;
      data: T;
    }
  | { success: false; error: E };

export const createNeverpanic = <
  D = unknown,
  E = unknown,
>() => {
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

  const safeFn =
    <
      T extends Result<D, E> | Promise<Result<D, E>>,
      A extends unknown[],
      EH extends Result<D, E>,
    >(
      cb: (...args: A) => T,
      eh: (e: unknown) => EH,
    ): ((...args: A) => T | EH) =>
    (...args) => {
      try {
        const result = cb(...args);

        if (result instanceof Promise)
          return result.catch(eh) as T;

        return result;
      } catch (e) {
        return eh(e);
      }
    };

  const fromUnsafe = <
    T extends D | Promise<D>,
    EH extends Result<D, E>,
    R = T extends Promise<infer U>
      ? Promise<{ success: true; data: U }>
      : { success: true; data: T },
  >(
    cb: () => T,
    eh: (err: unknown) => EH,
  ): R | EH => {
    try {
      const result = cb();

      if (result instanceof Promise)
        return result.then(ok).catch(eh) as R;

      return ok(result as D) as R;
    } catch (e) {
      return eh(e);
    }
  };

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
};

export const n = createNeverpanic();
