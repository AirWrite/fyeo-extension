import { initTRPC } from "@trpc/server"
import { createChromeHandler } from "trpc-browser/adapter"

const makeT = () => initTRPC.create({
    isServer: false,
    allowOutsideOfServer: true,
})

const makeAppRouter = () => {
    const t = makeT()
    const router = t.router({
        explode: t.procedure.query(() => {
            throw new Error('Exploded!')
        }),
    })
    return router
}

export type AppRouter = ReturnType<typeof makeAppRouter>

export default defineBackground(() => {
  const appRouter = makeAppRouter()
  console.log('Hello background!', { id: browser.runtime.id });

  createChromeHandler({
      router: appRouter,
  })
});
