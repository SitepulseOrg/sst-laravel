/**
 * The subset of `sst.aws.Service` arguments that the Laravel component forwards
 * verbatim from a `web`, `workers[]`, or `reverb` config block. These are pure
 * passthroughs — the component does not transform them, it only relays them to
 * the underlying service so options like `cpu`/`memory` actually take effect.
 */
export const FORWARDED_SERVICE_ARG_KEYS = [
  'architecture',
  'cpu',
  'memory',
  'storage',
  'logging',
  'health',
  'executionRole',
] as const;

export type ForwardedServiceArgKey = (typeof FORWARDED_SERVICE_ARG_KEYS)[number];

/**
 * Picks the passthrough service arguments from a service config block so they
 * can be spread into the `sst.aws.Service` args. Only keys that are actually
 * set are returned, so spreading the result never overrides a service default
 * with an explicit `undefined`.
 */
export function buildServiceArgs<
  T extends Partial<Record<ForwardedServiceArgKey, unknown>>,
>(config?: T): Pick<T, ForwardedServiceArgKey> {
  const result = {} as Pick<T, ForwardedServiceArgKey>;

  if (!config) {
    return result;
  }

  for (const key of FORWARDED_SERVICE_ARG_KEYS) {
    if (config[key] !== undefined) {
      result[key] = config[key] as T[ForwardedServiceArgKey];
    }
  }

  return result;
}
