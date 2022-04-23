import * as THREE from 'three';
import { timeScale } from './config';

type placeDataBuffers = {
	timeBuffer: Uint32Array;
	userIdBuffer: Uint32Array;
	xyBuffer: Uint16Array;
	colorBuffer: Uint8Array;
};
export const bufferSplit = (buffer: ArrayBuffer) => {
	let offset = 0;
	const metadata = new Uint32Array(buffer, offset, 1);
	const [arrayLength] = metadata;
	console.log(arrayLength);

	const timeBuffer = new Uint32Array(buffer, (offset += 4), arrayLength);
	const userIdBuffer = new Uint32Array(buffer, (offset += arrayLength * 4), arrayLength);
	const xyBuffer = new Uint16Array(buffer, (offset += arrayLength * 4), arrayLength * 2);
	const colorBuffer = new Uint8Array(buffer, (offset += arrayLength * 4), arrayLength);

	return {
		timeBuffer,
		userIdBuffer,
		xyBuffer,
		colorBuffer
	};
};
export const createAttributes = (buffers: placeDataBuffers) => {
	const positions = new Float32Array(
		buffers.timeBuffer.reduce((acc, time, i) => {
			acc.push(
				buffers.xyBuffer[i * 2 + 0] - 1000,
				time / timeScale,
				buffers.xyBuffer[i * 2 + 1] - 1000
			);
			return acc;
		}, [])
	);

	const color = new THREE.Color();
	const colors = new Uint8Array(
		buffers.colorBuffer.reduce((acc, colorCode, i) => {
			color.set(colorMap[colorCode]);
			acc.push(color.r * 255, color.g * 255, color.b * 255);
			return acc;
		}, [])
	);

	return {
		positions,
		colors,
		userId: buffers.userIdBuffer
	};
};

export const colorMap = {
	0: '#00CCC0',
	1: '#94B3FF',
	2: '#6A5CFF',
	3: '#009EAA',
	4: '#E4ABFF',
	5: '#000000',
	6: '#00756F',
	7: '#00A368',
	8: '#00CC78',
	9: '#2450A4',
	10: '#3690EA',
	11: '#493AC1',
	12: '#515252',
	13: '#51E9F4',
	14: '#6D001A',
	15: '#6D482F',
	16: '#7EED56',
	17: '#811E9F',
	18: '#898D90',
	19: '#9C6926',
	20: '#B44AC0',
	21: '#BE0039',
	22: '#D4D7D9',
	23: '#DE107F',
	24: '#FF3881',
	25: '#FF4500',
	26: '#FF99AA',
	27: '#FFA800',
	28: '#FFB470',
	29: '#FFD635',
	30: '#FFF8B8',
	31: '#FFFFFF'
};

export const fetchAndAdd = (
	name: string,
	group: THREE.group,
	material: THREE.material,
	split = 1
) => {
	fetch(`place-data/${name}.bin`)
		.then((res) => res.arrayBuffer())
		.then((buffer) => {
			const buffers = bufferSplit(buffer);
			const attributes = createAttributes(buffers);
			const itemCount = attributes.userId.length;

			const blockSize = Math.floor(itemCount / split);

			for (let i = 0; i < split; i++) {
				const startIndex = i * blockSize;
				const endIndex = startIndex + blockSize;

				let slicedPositions = null;
				let slicedColors = null;
				let slicedUserId = null;
				if (i === split - 1) {
					// compensate for lost points from Math.floor
					slicedPositions = attributes.positions.slice(startIndex * 3);
					slicedColors = attributes.colors.slice(startIndex * 3);
					slicedUserId = attributes.userId.slice(startIndex);
				} else {
					slicedPositions = attributes.positions.slice(startIndex * 3, endIndex * 3);
					slicedColors = attributes.colors.slice(startIndex * 3, endIndex * 3);
					slicedUserId = attributes.userId.slice(startIndex, endIndex);
				}

				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.Float32BufferAttribute(slicedPositions, 3));
				geometry.setAttribute('color', new THREE.Uint8BufferAttribute(slicedColors, 3));
				geometry.setAttribute('userId', new THREE.Uint8BufferAttribute(slicedUserId, 3));

				// geometry.setDrawRange(0,10000);

				const points = new THREE.Points(geometry, material);
				group.add(points);
			}
		});
};
