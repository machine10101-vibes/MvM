import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

/** Must match Vite `base: '/MvM/'` for GitHub Pages. */
export const BASE_PATH = "/MvM";

export const router = createRouter({
  routeTree,
  defaultErrorComponent: AppErrorComponent,
  basepath: BASE_PATH,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
