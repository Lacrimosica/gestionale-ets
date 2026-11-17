// .sql files are bundled as text (see the Text rule in wrangler.demo-reset.toml).
declare module '*.sql' {
  const content: string;
  export default content;
}
