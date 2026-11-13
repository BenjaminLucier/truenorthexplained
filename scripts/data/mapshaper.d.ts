/** Minimal types for the parts of mapshaper's Node API the data scripts use. */
declare module "mapshaper" {
  const mapshaper: {
    runCommands(commands: string, done: (err: Error | null) => void): void;
  };
  export default mapshaper;
}
