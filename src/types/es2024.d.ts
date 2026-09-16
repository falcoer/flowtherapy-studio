interface ObjectConstructor {
  groupBy<T, K extends PropertyKey>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K,
  ): Partial<Record<K, T[]>>;
}
