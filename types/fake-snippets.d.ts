declare module '@tscircuit/fake-snippets/bundle' {
  const bundle: {
    makeRequest: (req: any, options: any) => Promise<any>
  }
  export default bundle
} 