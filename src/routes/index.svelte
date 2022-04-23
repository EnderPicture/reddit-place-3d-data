<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy, onMount } from 'svelte';
	import { bufferSplit, createAttributes, fetchAndAdd, timeToLayer } from '$lib/helper';
	import { fragShader, vertexShader } from '$lib/shaders';
	import { offsetTime, timeScale, totalHeight } from '$lib/config';

	$: actualHeight = totalHeight / timeScale;

	let container: HTMLDivElement;
	let material: THREE.material;
	let scene: THREE.scene;
	let camera: THREE.camera;
	let spinGroup: THREE.group;
	let pointsGroup: THREE.group;
	let renderer: THREE.renderer;

	let windowWidth: number;
	let windowHeight: number;

	let opacity = 0.5;
	let allWhite = false;

	let y: number;

	const setupCamera = () => {
		camera = new THREE.PerspectiveCamera(
			25,
			container.clientWidth / container.clientHeight,
			100,
			10000
		);
		camera.position.z = 5000;
		camera.position.y = 800;
		camera.rotation.x = -0.3;
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
		});

		fetchAndAdd('all-reduced', spinGroup, material, 50);

		loadLayer();

		const animate = () => {
			const time = Date.now() * 0.001;

			if (spinGroup) {
				spinGroup.rotation.y = time * 0.1;
			}
			camera.position.y = actualHeight - y + 2000;
			material.uniforms.scrollPos.value = camera.position.y;
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
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
			material.uniforms.scrollPos.value = y;
			material.uniforms.opacity.value = opacity * opacity * opacity * opacity;
			material.uniforms.colorAdd.value = allWhite ? 1 : 0;
		}
	};

	const resize = () => {
		if (renderer) {
			camera.aspect = windowWidth / windowHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(windowWidth, windowHeight);
		}
	};

	$: date = new Date((actualHeight - y) * timeScale + offsetTime);
	$: opacity, allWhite, y, updateMateiral();
	$: windowWidth, windowHeight, resize();

	const loadLayer = () => {
		while (pointsGroup.children.length) {
			console.log('hi');
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
<div class="height" style={`height: calc(100vh + ${actualHeight - 1}px)`} />

<div class="container controls">
	<input type="range" min="0" max="1" step="0.001" bind:value={opacity} />
	<input type="checkbox" bind:checked={allWhite} />
	<button on:click={loadLayer}>load all data at time time</button>
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
		color: white;
		/* mix-blend-mode: difference; */
	}
</style>
