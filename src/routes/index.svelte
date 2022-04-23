<script lang="ts">
	import * as THREE from 'three';
	import { onMount } from 'svelte';
	import { bufferSplit, createAttributes, fetchAndAdd } from '$lib/helper';
	import { fragShader, vertexShader } from '$lib/shaders';
	import { timeScale, totalHeight } from '$lib/config';

	$: actualHeight = totalHeight / timeScale;

	let container: HTMLDivElement;
	let material: THREE.material;
	let scene: THREE.scene;
	let camera: THREE.camera;
	let group: THREE.group;
	let renderer: THREE.renderer;

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

		group = new THREE.Group();
		scene.add(group);

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

		fetchAndAdd('all-reduced', group, material, 50);
		fetchAndAdd('layer-101', group, material);

		const animate = () => {
			const time = Date.now() * 0.001;

			if (group) {
				group.rotation.y = time * 0.1;
			}
			camera.position.y = actualHeight - y + 2000;
			material.uniforms.scrollPos.value = camera.position.y;
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
			console.log(renderer.info.render.calls);
		};
		animate();
	});

	$: if (material) material.uniforms.scrollPos.value = camera.position.y;
	$: if (material) material.uniforms.opacity.value = opacity * opacity * opacity * opacity;
	$: if (material) material.uniforms.colorAdd.value = allWhite ? 1 : 0;
</script>

<svelte:window bind:scrollY={y} />
<div class="container" bind:this={container} />
<div class="height" style={`height: calc(100vh + ${actualHeight}px)`} />

<div class="container">
	<input type="range" min="0" max="1" step="0.001" bind:value={opacity} />
	<input type="checkbox" bind:checked={allWhite} />
</div>

<style>
	.container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
	}
</style>
