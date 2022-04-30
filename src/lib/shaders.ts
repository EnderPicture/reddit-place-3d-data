export const vertexShader = `
attribute vec3 color;
varying vec3 vColor;

void main() {

  vColor = color;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  
  gl_PointSize = 3.0;
  gl_Position = projectionMatrix * mvPosition;
}
`;
export const fragShader = `
uniform sampler2D pointTexture;
uniform float opacity;
uniform float colorAdd;

varying vec3 vColor;

void main() {

  gl_FragColor = vec4(vColor/255.0 + colorAdd, opacity );
  gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
}
`;