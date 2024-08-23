import { defineConfig } from 'vitest/config' // eslint-disable-line

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
