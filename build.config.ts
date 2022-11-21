import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/client'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
})
