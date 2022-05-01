<script lang="ts">
	import * as THREE from 'three';
	import { onDestroy, onMount } from 'svelte';
	import { bufferSplit, createAttributes, fetchAndAdd, map, timeToLayer } from '$lib/helper';
	import { fragShader, vertexShader } from '$lib/shaders';
	import { offsetTime, timeScale, totalHeight, largestUserId } from '$lib/config';

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
	let lastTime = 0;
	let numOfMarkers = 100;

	const controls = {
		opacity: 0.6,
		allWhite: false,
		topView: false,
		zoom: 0.5,
		userId: 100,
		spin: true
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
		renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true });
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
				colorAdd: { value: 0 },
				selectedUserId: { value: 0 }
			},
			vertexShader: vertexShader,
			fragmentShader: fragShader,

			depthTest: false,
			transparent: true
			// blending: THREE.AdditiveBlending,
		});

		fetchAndAdd('all-reduced', spinGroup, material, 50);

		// loadLayer();

		const animate = () => {
			const time = Date.now() * 0.001;

			if (controls.topView) {
				spinGroup.rotation.y = 0;

				cameraTop.position.y = actualHeight - y;
				cameraTop.zoom = map(controls.zoom, 0, 1, 0.1, 0.75);
				cameraTop.updateProjectionMatrix();

				renderer.render(scene, cameraTop);
			} else {
				if (spinGroup && controls.spin) {
					spinGroup.rotation.y += (time - lastTime) * 0.1;
				}
				lastTime = time;

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
			material.uniforms.selectedUserId.value = controls.userId;
		}
	};

	const resize = () => {
		if (renderer) {
			const width = container.clientWidth;
			const height = container.clientHeight;
			renderer.setSize(width, height);

			camera.aspect = width / height;
			camera.updateProjectionMatrix();

			cameraTop.left = width / -2;
			cameraTop.right = width / 2;
			cameraTop.top = height / 2;
			cameraTop.bottom = height / -2;
			cameraTop.updateProjectionMatrix();
		}
	};

	$: date = new Date((actualHeight - y) * timeScale + offsetTime);
	$: controls.opacity, controls.allWhite, controls.userId, y, updateMateiral();
	$: windowWidth, windowHeight, resize();
	$: controls.userId = controls.userId < 0 ? 0 : controls.userId;
	$: controls.userId = largestUserId < controls.userId ? largestUserId : controls.userId;
	$: markers = Array(numOfMarkers + 1)
		.fill(0)
		.map((_, i) => {
			let offset = (actualHeight / numOfMarkers) * i;
			return {
				offset,
				date: new Date((actualHeight - offset) * timeScale + offsetTime)
			};
		});

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
<div class="currentTime">
	<p>
		{date.toDateString()}
	</p>
	<p>
		{date.toLocaleTimeString()}
	</p>
</div>
<div class="overlay">
	{#each markers as marker}
		<div class="marker" style={`top: calc(50vh + ${marker.offset}px)`}>
			<p>
				{marker.date.toDateString()}
			</p>
			<p>
				{marker.date.toLocaleTimeString()}
			</p>
		</div>
	{/each}
</div>

<div class="controls">
	<label>
		<p>opacity</p>
		<input type="range" min="0" max="1" step="0.001" bind:value={controls.opacity} />
	</label>
	<label>
		<p>zoom</p>
		<input type="range" min="0" max="1" step="0.001" bind:value={controls.zoom} />
	</label>
	<label>
		<p>user id selector</p>
		<input type="number" step="1" size="0" bind:value={controls.userId} />
	</label>
	<label>
		<p>show all white</p>
		<input type="checkbox" bind:checked={controls.allWhite} />
	</label>
	<label>
		<p>top events view</p>

		<input type="checkbox" bind:checked={controls.topView} />
	</label>
	<label>
		<p>spin</p>

		<input type="checkbox" bind:checked={controls.spin} />
	</label>
	<button on:click={loadLayer}>load all data at time</button>
</div>

<style lang="scss">
	.currentTime {
		position: fixed;
		top: 50vh;
		right: 0;
		color: white;
		transform: translateY(-50%);
		padding: 1rem;
		margin: 0;
		p {
			margin: 0;
		}
	}
	.overlay {
		position: absolute;
		top: 0;
		right: 0;
		color: white;
		.marker {
			position: absolute;
			top: 0;
			right: 0;
			margin: 0;
			white-space: nowrap;
			padding: 1rem;
			transform: translateY(-50%);
			> p {
				margin: 0;
			}
		}
	}
	label {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		p {
			text-align: right;
			margin: 0;
		}
		margin-bottom: 0.25rem;
	}
	.container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
	}
	.controls {
		padding: 1rem;
		position: fixed;
		bottom: 0;
		left: 0;
		color: white;
		input {
			min-width: 0;
		}
		button {
			display: flex;
			justify-content: center;
			padding: 0.5rem 1rem;
			border: none;
			width: 100%;
		}
		// mix-blend-mode: difference;
	}
</style>
