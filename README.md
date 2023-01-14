# Three.js Mirror
[![npm version](https://img.shields.io/npm/v/@fern-solutions/three-mirror.svg?style=flat-square)](https://www.npmjs.com/package/@fern-solutions/three-mirror)
[![npm version](https://img.shields.io/npm/l/@fern-solutions/three-mirror.svg?style=flat-square)](https://www.npmjs.com/package/@fern-solutions/three-mirror)
[![github](https://flat.badgen.net/badge/icon/github?icon=github&label)](https://github.com/mrxz/three-mirror/)
[![twitter](https://flat.badgen.net/twitter/follow/noerihuisman)](https://twitter.com/noerihuisman)
[![ko-fi](https://img.shields.io/badge/ko--fi-buy%20me%20a%20coffee-ff5f5f?style=flat-square)](https://ko-fi.com/fernsolutions)

**This is a WIP project**

This project introduces a `Mirror` object that you can add to your Three.js scenes. It's based on my A-Frame component and works in the same way: [@fern-solutions/aframe-mirror](https://github.com/mrxz/fern-aframe-components/tree/main/mirror)

## Usage
See [example/index.html](example/index.html) for an example of how to use this.

## Limitations
* Mirrors are not rendered recursively, so any mirror seen from another mirror will just render as an opaque plane
* Avoid mixing transparency with mirrors (e.g. looking at a mirror through transparent objects). Depending on the render-order this either results in the overlap being an opaque mirror or the transparent object not being visible.
