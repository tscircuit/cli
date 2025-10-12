import { test } from "bun:test";



const originalSkip = test.skip;
const originalTest = test;


const conditionalTest = (name: string, fn: any, options?: any) => {

  if (process.env.SKIP_NETWORK_TESTS === "true" && 
      (name.includes("network") || 
       name.includes("api") || 
       name.includes("registry") || 
       name.includes("search") || 
       name.includes("login") || 
       name.includes("push") || 
       name.includes("release") ||
       name.includes("simulate") ||
       name.includes("import"))) {
    return originalSkip(name, fn, options);
  }
  return originalTest(name, fn, options);
};


Object.assign(test, conditionalTest);