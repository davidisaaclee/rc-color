document.addEventListener('DOMContentLoaded', () => setup());

const Range = {
	span: (range) => range.upper - range.lower,

	// convert(3, { from: range1, to: range2 })
	// convert(3, { to: range2, from: range1 })
	convert: (value, options) =>
		(value - options.from.lower) / Range.span(options.from) * Range.span(options.to) + options.to.lower,

	clamp: (value, range) => Math.max(range.lower, Math.min(range.upper, value)),

	controls: {
		l: { lower: 0, upper: 100 },
		a: { lower: 0, upper: 100 },
		b: { lower: 0, upper: 100 },
	},
	colorspace: {
		l: { lower: 0, upper: 100 },
		a: { lower: -100, upper: 100 },
		b: { lower: -100, upper: 100 }
	},
	graphics: {
		axes: {
			l: { lower: -50, upper: 50 },
			a: { lower: -50, upper: 50 },
			b: { lower: -50, upper: 50 },
		}
	}
};

var state = {
	color: {
		l: Range.colorspace.l.lower,
		a: Range.colorspace.a.lower,
		b: Range.colorspace.b.lower
	},
	cameraPosition: 0,
	renderedObjects: {},
	scene: null
};

function setup() {
	setupStage();

	const sliders = {
		l: document.querySelector('#l-picker'),
		a: document.querySelector('#a-picker'),
		b: document.querySelector('#b-picker')
	};

	Object.keys(sliders).forEach((key) => {
		// Respond to changes in the sliders.
		sliders[key].addEventListener('input', () =>
			setComponent(
				key, 
				Range.convert(
					Number(sliders[key].value), 
					{ from: Range.controls[key], to: Range.colorspace[key] })));

		// Set the initial value of the slider to the value in `state`.
		sliders[key].value =
			Range.convert(state.color[key], { from: Range.colorspace[key], to: Range.controls[key] });
	});
}

function setupStage() {
	var scene = new THREE.Scene();
	state.scene = scene;
	var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	var axesSize = new THREE.Vector3(
		Range.span(Range.graphics.axes.l), 
		Range.span(Range.graphics.axes.a), 
		Range.span(Range.graphics.axes.b));

	var geometry = 
		new THREE.WireframeGeometry(
			new THREE.BoxGeometry(axesSize.x, axesSize.y, axesSize.z));

	var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	var line = new THREE.LineSegments(geometry, material);
	line.material.depthTest = false;
	line.material.opacity = 0.25;
	line.material.transparent = true;
	scene.add(line);

	var pointGeometry =
		new THREE.BoxGeometry(1, 1, 1);
	var mesh = new THREE.Mesh(pointGeometry, material);
	// Offset mesh to start at (0, 0, 0) in colorspace.
	// (This should just be part of the normal update...)
	mesh.position.copy(axesSize.clone().multiplyScalar(-0.5));
	scene.add(mesh);

	state.renderedObjects['point'] = mesh;
	state.renderedObjects['camera'] = camera;

	camera.position.z = 150;

	function update() {
		state.renderedObjects['camera'].position.x =
			Math.cos(state.cameraPosition) * 150;
		state.renderedObjects['camera'].position.z =
			Math.sin(state.cameraPosition) * 150;
		state.renderedObjects['camera']
			.lookAt(new THREE.Vector3(0, 0, 0));

		state.cameraPosition += 0.01;

		state.color.l +=
			Range.convert(
				Math.random(), 
				{ from: { lower: 0, upper: 1 }, to: { lower: -20, upper: 20 } });
		state.color.l =
			Range.clamp(state.color.l, Range.colorspace.l);

		state.color.a +=
			Range.convert(
				Math.random(), 
				{ from: { lower: 0, upper: 1 }, to: { lower: -20, upper: 20 } });
		state.color.a =
			Range.clamp(state.color.a, Range.colorspace.a);

		state.color.b +=
			Range.convert(
				Math.random(), 
				{ from: { lower: 0, upper: 1 }, to: { lower: -20, upper: 20 } });
		state.color.b =
			Range.clamp(state.color.b, Range.colorspace.b);
	}

	function render() {
		update();

		requestAnimationFrame( render );
		renderer.render( scene, camera );
	}
	render();
}

function colorFromPoint(point) {
	return chroma.lab(
		Range.convert(point.x, { from: Range.graphics.axes.l, to: Range.colorspace.l }),
		Range.convert(point.y, { from: Range.graphics.axes.a, to: Range.colorspace.a }),
		Range.convert(point.z, { from: Range.graphics.axes.b, to: Range.colorspace.b }));
}

function pointFromLAB(l, a, b) {
	return new THREE.Vector3(
		Range.convert(l, { to: Range.graphics.axes.l, from: Range.colorspace.l }),
		Range.convert(a, { to: Range.graphics.axes.a, from: Range.colorspace.a }),
		Range.convert(b, { to: Range.graphics.axes.b, from: Range.colorspace.b }));
}

// function addColorBubble(point) {
//	var point = point.clone();
//	var color = colorFromPoint(point);

//	var pointGeometry =
//		new THREE.BoxGeometry(1, 1, 1);
//	var material =
//		new THREE.MeshBasicMaterial({ color: color.hex() });

//	var mesh = new THREE.Mesh(pointGeometry, material);
//	mesh.position.copy(point);

//	state.scene.add(mesh);
// }

function addColorBubbleAtColor(l, a, b) {
	var point = pointFromLAB(l, a, b);
	var color = chroma.lab(l, a, b);

	var pointGeometry =
		new THREE.BoxGeometry(1, 1, 1);
	var material =
		new THREE.MeshBasicMaterial({ color: color.hex() });

	var mesh = new THREE.Mesh(pointGeometry, material);
	mesh.position.copy(point);

	state.scene.add(mesh);
}

function setComponent(componentKey, value) {
	state.color[componentKey] = value;
	render(state);
}

function render(state) {
	state.renderedObjects['point'].position.copy(pointFromLAB(state.color.l, state.color.a, state.color.b));

	addColorBubbleAtColor(state.color.l, state.color.a, state.color.b);

	const color =
		chroma.lch(state.color.l, state.color.a, state.color.b);

	document.querySelector('html').style['background-color'] =
		color.hex();
}