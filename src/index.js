import * as THREE from 'three';

export class Mirror extends THREE.Mesh {
	constructor(geometry, options = {}) {
		super(geometry);

		this.mirrorId = (options.mirrorId !== undefined) ? options.mirrorId : 1;
		this.renderSelf = (options.renderSelf !== undefined ) ? options.renderSelf : true;
		this.clearDepth = (options.clearDepth !== undefined ) ? options.clearDepth : true;
		this.type = 'Mirror';

		const material = new THREE.MeshBasicMaterial({
			stencilWrite: true,
			stencilFunc: THREE.AlwaysStencilFunc,
			stencilZPass: THREE.ReplaceStencilOp,
			stencilZFail: THREE.KeepStencilOp,
			stencilRef: this.mirrorId,
		});
		this.material = material;

		const clippingPlane = new THREE.Plane();
		const tempCameras = [new THREE.PerspectiveCamera(), new THREE.PerspectiveCamera()];
		const _reflectionMatrix = new THREE.Matrix4();
		const _normal = new THREE.Vector3();
		const _mirrorPos = new THREE.Vector3();
		const _mirrorQuat = new THREE.Quaternion();
		const _cameraPos = new THREE.Vector3();
		const _cameraLPos = new THREE.Vector3();
		const _cameraRPos = new THREE.Vector3();
		const _tempPlane = new THREE.Plane();
		const _tempV4 = new THREE.Vector4();
		const _q = new THREE.Quaternion();

		// Note: this method is straight from THREE.js WebXRManager.js
		// See: https://github.com/mrdoob/three.js/blob/8fd3b2acbd08952deee1e40c18b00907c5cd4c4d/src/renderers/webxr/WebXRManager.js#L429
		// Its replicated here since we do need its behaviour, but can't use the rest
		// of the XR camera auto updating logic.
		// Falls under The MIT License:
		// Copyright © 2010-2023 three.js authors
		function setProjectionFromUnion(camera, cameraL, cameraR) {
			_cameraLPos.setFromMatrixPosition(cameraL.matrixWorld);
			_cameraRPos.setFromMatrixPosition(cameraR.matrixWorld);

			const ipd = _cameraLPos.distanceTo(_cameraRPos);

			const projL = cameraL.projectionMatrix.elements;
			const projR = cameraR.projectionMatrix.elements;

			// VR systems will have identical far and near planes, and
			// most likely identical top and bottom frustum extents.
			// Use the left camera for these values.
			const near = projL[ 14 ] / ( projL[ 10 ] - 1 );
			const far = projL[ 14 ] / ( projL[ 10 ] + 1 );
			const topFov = ( projL[ 9 ] + 1 ) / projL[ 5 ];
			const bottomFov = ( projL[ 9 ] - 1 ) / projL[ 5 ];

			const leftFov = ( projL[ 8 ] - 1 ) / projL[ 0 ];
			const rightFov = ( projR[ 8 ] + 1 ) / projR[ 0 ];
			const left = near * leftFov;
			const right = near * rightFov;

			// Calculate the new camera's position offset from the
			// left camera. xOffset should be roughly half `ipd`.
			const zOffset = ipd / ( - leftFov + rightFov );
			const xOffset = zOffset * - leftFov;

			// TODO: Better way to apply this offset?
			cameraL.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale );
			camera.translateX( xOffset );
			camera.translateZ( zOffset );
			camera.matrixWorld.compose( camera.position, camera.quaternion, camera.scale );
			camera.matrixWorldInverse.copy( camera.matrixWorld ).invert();

			// Find the union of the frustum values of the cameras and scale
			// the values so that the near plane's position does not change in world space,
			// although must now be relative to the new union camera.
			const near2 = near + zOffset;
			const far2 = far + zOffset;
			const left2 = left - xOffset;
			const right2 = right + ( ipd - xOffset );
			const top2 = topFov * far / far2 * near2;
			const bottom2 = bottomFov * far / far2 * near2;

			camera.projectionMatrix.makePerspective( left2, right2, top2, bottom2, near2, far2 );
		}

		const adjustProjectionMatrix = function(sceneCamera) {
			_tempPlane.copy(clippingPlane).applyMatrix4(sceneCamera.matrixWorldInverse);
			const clipPlane = _tempV4.set(_tempPlane.normal.x, _tempPlane.normal.y, _tempPlane.normal.z, _tempPlane.constant);
			const projectionMatrix = sceneCamera.projectionMatrix;

			_q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
			_q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
			_q.z = -1.0;
			_q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

			// Calculate the scaled plane vector
			clipPlane.multiplyScalar(2.0 / clipPlane.dot(_q));

			projectionMatrix.elements[2] = clipPlane.x;
			projectionMatrix.elements[6] = clipPlane.y;
			projectionMatrix.elements[10] = clipPlane.z + 1.0 - 0.0;
			projectionMatrix.elements[14] = clipPlane.w;
		};

		this.render = function(renderer, scene, camera) {
			this.visible = false;

			// Temporarily move the camera
			const sceneCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : tempCameras[0];

			// Mirror plane definition
			const mirrorPos = this.getWorldPosition(_mirrorPos);
			const n = _normal.set(0, 0, 1);
			n.applyQuaternion(this.getWorldQuaternion(_mirrorQuat));
			const d = -mirrorPos.dot(n);
			clippingPlane.set(n, d);

			// Make sure the mirror can be seen
			let visible;
			if(renderer.xr.isPresenting) {
				const cameras = sceneCamera.cameras;
				_cameraLPos.setFromMatrixPosition(cameras[0].matrixWorld);
				_cameraRPos.setFromMatrixPosition(cameras[1].matrixWorld);
				visible =
					_cameraLPos.subVectors(mirrorPos, _cameraLPos).dot(n) <= 0.0 ||
					_cameraRPos.subVectors(mirrorPos, _cameraRPos).dot(n) <= 0.0;

			} else {
				const view = camera.getWorldPosition(_cameraPos).subVectors(mirrorPos, _cameraPos);
				visible = view.dot(n) <= 0.0;
			}
			if(visible) {
				// Construct reflection matrix for the mirror plane
				const reflectionMatrix = _reflectionMatrix.set(
				  1 -2*n.x*n.x,  -2*n.x*n.y,  -2*n.x*n.z, -2*n.x*d,
					-2*n.x*n.y, 1-2*n.y*n.y,  -2*n.y*n.z, -2*n.y*d,
					-2*n.x*n.z,  -2*n.y*n.z, 1-2*n.z*n.z, -2*n.z*d,
					 0,           0,           0,          1
				);

				// Update camera(s) for rendering the 'mirror' world
				if(renderer.xr.isPresenting) {
					// Use temp-cameras to store camera matrices
					const cameras = sceneCamera.cameras;
					for(let i = 0; i < cameras.length; i++) {
						tempCameras[i].matrixWorld.copy(cameras[i].matrixWorld);
						tempCameras[i].matrixWorldInverse.copy(cameras[i].matrixWorldInverse);
						tempCameras[i].projectionMatrix.copy(cameras[i].projectionMatrix);
						tempCameras[i].layers.mask = cameras[i].layers.mask;

						cameras[i].matrixWorld.premultiply(reflectionMatrix);
						cameras[i].matrixWorldInverse.copy(cameras[i].matrixWorld).invert();
					}

					// Set projection matrix for frustum culling
					setProjectionFromUnion(sceneCamera, cameras[0], cameras[1]);

					// Apply clipping plane in projection matrix
					adjustProjectionMatrix(cameras[0]);
					adjustProjectionMatrix(cameras[1]);
				} else {
					sceneCamera.near = camera.near;
					sceneCamera.far = camera.far;
					sceneCamera.projectionMatrix.copy(camera.projectionMatrix);

					sceneCamera.matrix.copy(camera.matrixWorld).premultiply(reflectionMatrix);
					sceneCamera.matrix.decompose(
						sceneCamera.position,
						sceneCamera.quaternion,
						sceneCamera.scale);
					sceneCamera.matrixWorld.copy(sceneCamera.matrix);
					sceneCamera.matrixWorldInverse.copy(sceneCamera.matrix).invert();
					adjustProjectionMatrix(sceneCamera);
				}

				// Render 'mirror' world
				renderer.xr.cameraAutoUpdate = false;
				// Monkey patch setMaterial on WebGLState
				const oldWebGLStateSetMaterialFn = renderer.state.setMaterial;
				renderer.state.setMaterial = function(material, frontFaceCW) {
					oldWebGLStateSetMaterialFn(material, !frontFaceCW);
				};
				renderer.state.buffers.stencil.setTest(true);
				renderer.state.buffers.stencil.setFunc(THREE.EqualStencilFunc, this.mirrorId, 0xFF);
				renderer.state.buffers.stencil.setOp(THREE.KeepStencilOp, THREE.KeepStencilOp, THREE.KeepStencilOp);
				renderer.state.buffers.stencil.setLocked(true);

				if(this.clearDepth) {
					renderer.clearDepth();
				}
				const oldAutoClear = renderer.autoClear;
				renderer.autoClear = false;
				renderer.render(scene, sceneCamera);
				renderer.autoClear = oldAutoClear;

				renderer.state.buffers.stencil.setLocked(false);
				renderer.state.setMaterial = oldWebGLStateSetMaterialFn;
				renderer.xr.cameraAutoUpdate = true;
			}

			this.visible = true;

			// Restore cameras (in case of XR)
			// Note: this is only really needed if you have multiple mirrors in a scene
			if(renderer.xr.isPresenting) {
				const cameras = sceneCamera.cameras;
				for(let i = 0; i < cameras.length; i++) {
					cameras[i].matrixWorld.copy(tempCameras[i].matrixWorld);
					cameras[i].matrixWorldInverse.copy(tempCameras[i].matrixWorldInverse);
					cameras[i].projectionMatrix.copy(tempCameras[i].projectionMatrix);
					cameras[i].layers.mask = tempCameras[i].layers.mask;
				}
			}
		}

		this.onAfterRender = function(renderer, scene, camera) {
			// In case of XR, only call the render hooks for the last camera (e.g. right eye)
			if(renderer.xr.isPresenting) {
				const cameras = renderer.xr.getCamera().cameras;
				if(camera != cameras[cameras.length - 1]) {
					return;
				}
			}

			if(this.renderSelf) {
				this.render(renderer, scene, camera);
			}
		}
	}
}