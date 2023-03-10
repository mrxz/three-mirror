import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

export default {
    input: 'src/index.js',
    plugins: [
        terser(),
    ],
    output: [
        {
            name: 'three-mirror',
            file: pkg.browser,
            format: 'umd',
            globals: {
                'three': 'THREE',
            }
        },
        {
            file: pkg.module,
            format: 'es',
        },
    ],
    external: ['three'],
};