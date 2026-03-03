module {
  // No migration needed as only in-logic bug fix
  type Actor = {};
  public func run(old : Actor) : Actor { old };
};
