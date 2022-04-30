<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy, onMount } from 'svelte';
	import { bufferSplit, createAttributes, fetchAndAdd, map, timeToLayer } from '$lib/helper';
	import { fragShader, vertexShader } from '$lib/shaders';
	import { offsetTime, timeScale, totalHeight } from '$lib/config';

	$: actualHeight = totalHeight / timeScale;

	let container: HTMLDivElement;
	let material: THREE.material;
	let scene: THREE.scene;
	let camera: THREE.camera;
	let cameraTop: THREE.camera;
	let spinGroup: THREE.group;
	let pointsGroup: THREE.group;
	let renderer: THREE.renderer;

	let windowWidth: number;
	let windowHeight: number;

	const controls = {
		opacity: 0.5,
		allWhite: false,
		topView: false,
		zoom: 0.1
	};

	let y: number;

	const setupCamera = () => {
		camera = new THREE.PerspectiveCamera(25, container.clientWidth / container.clientHeight);
		camera.rotation.x = -0.35;
		camera.fov = 25;
		camera.near = 1;
		camera.far = 1000000;
		camera.updateProjectionMatrix();

		cameraTop = new THREE.OrthographicCamera(
			container.clientWidth / -2,
			container.clientWidth / 2,
			container.clientHeight / 2,
			container.clientHeight / -2
		);
		cameraTop.position.z = 0;
		cameraTop.rotation.x = -Math.PI / 2;
		cameraTop.near = 0.1;
		cameraTop.far = 1000;
		cameraTop.updateProjectionMatrix();
	};
	const setupScene = () => {
		scene = new THREE.Scene();
	};
	const setupRenderer = () => {
		renderer = new THREE.WebGLRenderer({ alpha: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		container.appendChild(renderer.domElement);
	};

	onMount(() => {
		setupCamera();
		setupScene();
		setupRenderer();

		spinGroup = new THREE.Group();
		pointsGroup = new THREE.Group();
		spinGroup.add(pointsGroup);
		scene.add(spinGroup);

		material = new THREE.ShaderMaterial({
			uniforms: {
				pointTexture: { value: new THREE.TextureLoader().load('images/point.png') },
				scrollPos: { value: 1 },
				opacity: { value: 1 },
				colorAdd: { value: 0 }
			},
			vertexShader: vertexShader,
			fragmentShader: fragShader,

			depthTest: false,
			transparent: true
			// blending: THREE.AdditiveBlending,
		});

		fetchAndAdd('all-reduced', spinGroup, material, 50);

		loadLayer();

		const animate = () => {
			const time = Date.now() * 0.001;

			if (controls.topView) {
				spinGroup.rotation.y = 0;

				cameraTop.position.y = actualHeight - y;
				cameraTop.zoom = map(controls.zoom, 0, 1, .2, 2);
				cameraTop.updateProjectionMatrix();

				renderer.render(scene, cameraTop);
			} else {
				if (spinGroup) {
					spinGroup.rotation.y = time * 0.1;
				}

				let zoom = 1 - controls.zoom;
				let zoomDistance = map(zoom * zoom, 0, 1, 1000, 50000);

				let xShift = Math.cos(-camera.rotation.x) * zoomDistance;
				let yShift = Math.sin(-camera.rotation.x) * zoomDistance;

				camera.position.y = actualHeight - y + yShift;
				camera.position.z = xShift;
				camera.rotation.x = camera.rotation.x > -0.3 ? -0.3 : camera.rotation.x;
				camera.updateProjectionMatrix();

				renderer.render(scene, camera);
			}

			requestAnimationFrame(animate);
		};
		animate();
	});

	onDestroy(() => {
		if (scene) {
			while (scene.children.length) {
				scene.remove(scene.children[0]);
			}
		}
	});
	const updateMateiral = () => {
		if (material) {
			let { opacity, allWhite } = controls;
			material.uniforms.scrollPos.value = y;
			material.uniforms.opacity.value = opacity * opacity * opacity * opacity;
			material.uniforms.colorAdd.value = allWhite ? 1 : 0;
		}
	};

	const resize = () => {
		if (renderer) {
			camera.aspect = windowWidth / windowHeight;
			camera.updateProjectionMatrix();

			cameraTop.left = container.clientWidth / -2;
			cameraTop.right = container.clientWidth / 2;
			cameraTop.top = container.clientHeight / 2;
			cameraTop.bottom = container.clientHeight / -2;
			cameraTop.updateProjectionMatrix();
			renderer.setSize(windowWidth, windowHeight);
		}
	};

	$: date = new Date((actualHeight - y) * timeScale + offsetTime);
	$: controls.opacity, controls.allWhite, y, updateMateiral();
	$: windowWidth, windowHeight, resize();

	const loadLayer = () => {
		while (pointsGroup.children.length) {
			pointsGroup.remove(pointsGroup.children[0]);
		}
		let layer = timeToLayer((actualHeight - y) * timeScale);
		if (layer > 160) layer = 160;
		if (layer < 0) layer = 0;
		fetchAndAdd(`layer-${layer}`, pointsGroup, material);
	};
</script>

<svelte:window bind:scrollY={y} bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />
<div class="container" bind:this={container} />
<div class="height" style={`height: ${windowHeight + actualHeight - 1}px`} />

<div class="controls">
	<input type="range" min="0" max="1" step="0.001" bind:value={controls.opacity} />
	<input type="range" min="0" max="1" step="0.001" bind:value={controls.zoom} />
	<input type="checkbox" bind:checked={controls.allWhite} />
	<input type="checkbox" bind:checked={controls.topView} />
	<button on:click={loadLayer}>load all data at current time</button>
	<p>{date.toDateString()} {date.toLocaleTimeString()}</p>
</div>

<style>
	.container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
	}
	.controls {
		position: fixed;
		top: 0;
		left: 0;
		color: white;
		/* mix-blend-mode: difference; */
	}
</style>
